import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  DoorOpen,
  MapPin,
  Building2,
  FileText,
  Image as ImageIcon,
  Ruler,
  Shield,
  DollarSign,
  Edit,
  Users,
  Upload,
  FileCheck,
  Download,
  Trash2,
  Share2,
  Loader2,
  Camera,
  Zap,
  ExternalLink,
  Link2,
  Copy,
  RefreshCw,
  FileSignature,
  MessageSquare,
  Activity,
} from "lucide-react";
import type { Project, DoorOpening, InsertProject, Customer, CustomerLocation, VendorQuote, ManufacturerContact } from "@shared/schema";
import { insertProjectSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import { CopyButton } from "@/components/copy-button";
import { RecentItemsService } from "@/lib/recent-items";
import { ScheduleSiteVisitDialog } from "@/components/schedule-site-visit-dialog";
import { ErrorState } from "@/components/error-state";
import { CommentsList } from "@/components/comments/comments-list";
import { ActivityTimeline } from "@/components/activity-timeline";
import { OpeningFilters, OpeningFilterState } from "@/components/opening-filters";

const vendorQuoteUploadSchema = z.object({
  vendorContactId: z.string().min(1, "Vendor is required"),
  quoteNumber: z.string().optional(),
  quoteDate: z.string().optional(),
  validUntil: z.string().optional(),
  totalAmount: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const photoUploadSchema = z.object({
  openingId: z.string().min(1, "Opening is required"),
  photoType: z.string().default("general"),
});

export default function ProjectDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user, isLoading: isLoadingUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showQuoteUpload, setShowQuoteUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showQuickBooksExport, setShowQuickBooksExport] = useState(false);
  const [showDocuSignSend, setShowDocuSignSend] = useState(false);
  const [collaborationTab, setCollaborationTab] = useState<"comments" | "activity">("activity");
  const hasAutoSwitchedToComments = useRef(false);
  const [filterState, setFilterState] = useState<OpeningFilterState>({
    doorType: "all",
    fireRating: "all",
    hardwareGrade: "all",
  });
  
  const { data: project, isLoading: projectLoading, isError: projectError, error: projectErrorObj, refetch: refetchProject } = useQuery<Project>({
    queryKey: [`/api/projects/${id}`],
  });
  
  // Auto-switch to comments tab once when user is authenticated (only once per mount)
  useEffect(() => {
    if (!isLoadingUser && user && !hasAutoSwitchedToComments.current) {
      setCollaborationTab("comments");
      hasAutoSwitchedToComments.current = true;
    }
  }, [user, isLoadingUser]);
  
  // Track recently viewed projects
  useEffect(() => {
    if (project) {
      RecentItemsService.addRecentItem({
        id: project.id,
        type: "project",
        title: project.name,
        subtitle: project.location,
        url: `/projects/${project.id}`,
      });
    }
  }, [project]);

  const { data: openings = [], isLoading: openingsLoading, isError: openingsError, error: openingsErrorObj, refetch: refetchOpenings } = useQuery<DoorOpening[]>({
    queryKey: [`/api/projects/${id}/openings`],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/customers", project?.customerId],
    enabled: !!project?.customerId,
  });

  const { data: vendorQuotes = [] } = useQuery<VendorQuote[]>({
    queryKey: [`/api/projects/${id}/vendor-quotes`],
  });

  const { data: integrations = [] } = useQuery<any[]>({
    queryKey: ["/api/integrations"],
  });

  const { data: linkedResources = [] } = useQuery<any[]>({
    queryKey: [`/api/integrations/linked-resources`, { projectId: id }],
    enabled: !!id,
  });

  const { data: quickbooksStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/integrations/quickbooks/status"],
  });

  const { data: docusignStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/integrations/docusign/status"],
  });

  const deleteLinkedResource = useMutation({
    mutationFn: async (resourceId: string) => {
      return await apiRequest("DELETE", `/api/integrations/linked-resources/${resourceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/integrations/linked-resources`] });
      toast({
        title: "Success",
        description: "Linked external resource removed successfully. The integration link has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove linked resource",
        description: error.message || "Unable to remove the integration link. Please try again.",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async ({ service }: { service: string }) => {
      const response = await fetch(`/api/projects/${id}/sync/${service}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }
      return response.json();
    },
    onSuccess: (response: any) => {
      toast({
        title: "Success",
        description: `Project synced to ${response.result?.title || response.result?.name || response.externalUrl}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: vendors = [] } = useQuery<ManufacturerContact[]>({
    queryKey: ["/api/manufacturers"],
  });

  // Project edit form
  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      customerId: project?.customerId || "",
      locationId: project?.locationId || "",
      name: project?.name || "",
      location: project?.location || "",
      buildingType: project?.buildingType || "office",
      applicableStandards: project?.applicableStandards || [],
      status: project?.status || "active",
      notes: project?.notes || "",
    },
    values: project ? {
      customerId: project.customerId || "",
      locationId: project.locationId || "",
      name: project.name,
      location: project.location,
      buildingType: project.buildingType,
      applicableStandards: project.applicableStandards || [],
      status: project.status,
      notes: project.notes || "",
    } : undefined,
  });

  // Watch the selected customer to fetch their locations
  const selectedCustomerId = form.watch("customerId");

  const { data: customerLocations } = useQuery<CustomerLocation[]>({
    queryKey: ["/api/customers", selectedCustomerId, "locations"],
    enabled: !!selectedCustomerId && selectedCustomerId !== "none",
  });

  // Vendor quote upload form
  const quoteForm = useForm<z.infer<typeof vendorQuoteUploadSchema>>({
    resolver: zodResolver(vendorQuoteUploadSchema),
    defaultValues: {
      vendorContactId: "",
      quoteNumber: "",
      quoteDate: "",
      validUntil: "",
      totalAmount: "",
      description: "",
      notes: "",
    },
  });

  // Photo upload form
  const photoForm = useForm<z.infer<typeof photoUploadSchema>>({
    resolver: zodResolver(photoUploadSchema),
    defaultValues: {
      openingId: "",
      photoType: "general",
    },
  });

  const updateProject = useMutation({
    mutationFn: async (data: InsertProject) => {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, data);
      return await res.json();
    },
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      if (!updatedProject.customerId && project?.customerId) {
        queryClient.removeQueries({ queryKey: ["/api/customers", project.customerId] });
      }
      toast({
        title: "Success",
        description: "Project updated successfully. All changes have been saved and are now reflected in your project.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update project",
        description: error.message || "Unable to save project changes. Please verify all fields and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = useCallback((data: InsertProject) => {
    const projectData = {
      ...data,
      customerId: data.customerId && data.customerId !== "none" ? data.customerId : null,
      locationId: data.locationId && data.locationId !== "none" ? data.locationId : null,
    };
    updateProject.mutate(projectData);
  }, [updateProject]);

  const uploadVendorQuote = useMutation({
    mutationFn: async (data: z.infer<typeof vendorQuoteUploadSchema>) => {
      if (!selectedFile) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", id!);
      formData.append("vendorContactId", data.vendorContactId);
      formData.append("quoteNumber", data.quoteNumber || "");
      formData.append("quoteDate", data.quoteDate || "");
      formData.append("validUntil", data.validUntil || "");
      formData.append("totalAmount", data.totalAmount || "");
      formData.append("description", data.description || "");
      formData.append("notes", data.notes || "");

      const response = await fetch("/api/vendor-quotes", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload vendor quote");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/vendor-quotes`] });
      toast({
        title: "Quote uploaded",
        description: "Vendor quote has been uploaded successfully.",
      });
      setShowQuoteUpload(false);
      setSelectedFile(null);
      quoteForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload vendor quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteVendorQuote = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("DELETE", `/api/vendor-quotes/${quoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/vendor-quotes`] });
      toast({
        title: "Success",
        description: "Vendor quote deleted successfully. The quote file has been removed from the project.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete vendor quote",
        description: error.message || "Unable to remove vendor quote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCosts = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/projects/${id}/update-costs`);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/openings`] });
      toast({
        title: "Costs Updated",
        description: `Updated ${data.updatedItemsCount} hardware items with current pricing.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Unable to update costs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  }, []);

  const handlePhotoFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhotoFile(file);
      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const uploadPhoto = useMutation({
    mutationFn: async (data: z.infer<typeof photoUploadSchema>) => {
      if (!selectedPhotoFile) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append("file", selectedPhotoFile);
      formData.append("openingId", data.openingId);
      formData.append("photoType", data.photoType);

      const response = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload photo");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Photo uploaded",
        description: "Photo has been uploaded successfully.",
      });
      setShowPhotoUpload(false);
      setSelectedPhotoFile(null);
      setPhotoPreview(null);
      photoForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const exportToQuickBooks = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/quickbooks/export-invoice", {
        projectId: id,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to export to QuickBooks");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Exported to QuickBooks",
        description: `Invoice #${data.invoiceNumber} created successfully`,
      });
      setShowQuickBooksExport(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message || "Failed to export invoice to QuickBooks",
      });
    },
  });

  const handleDocuSignSend = useCallback(async () => {
    if (!customer) {
      toast({
        variant: "destructive",
        title: "Cannot send for signature",
        description: "Please add a customer to this project first",
      });
      return;
    }

    setShowDocuSignSend(true);
  }, [customer, toast]);

  const sendToDocuSign = useMutation({
    mutationFn: async (data: { email: string; name: string }) => {
      const pdfBlob = await fetch(`/api/projects/${id}/export-pdf`).then(r => r.blob());
      const reader = new FileReader();
      
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      
      reader.readAsDataURL(pdfBlob);
      const quotePdfBase64 = await base64Promise;

      const res = await apiRequest("POST", "/api/integrations/docusign/send-quote", {
        projectId: id,
        quotePdfBase64,
        signers: [{ email: data.email, name: data.name }],
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send to DocuSign");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sent for signature",
        description: `Quote sent successfully to ${customer?.name} via DocuSign`,
      });
      setShowDocuSignSend(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Send failed",
        description: error.message || "Failed to send quote for signature",
      });
    },
  });

  const downloadVendorQuote = useCallback((quoteId: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = `/api/vendor-quotes/${quoteId}/download`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const exportToPDF = useCallback(() => {
    const link = document.createElement("a");
    link.href = `/api/projects/${id}/export-pdf`;
    link.download = `${project?.name.replace(/[^a-z0-9]/gi, '_')}-survey.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "PDF Export Started",
      description: "Your project survey PDF is being generated and will download shortly.",
    });
  }, [id, project?.name, toast]);

  const downloadQuickReport = useCallback(() => {
    const link = document.createElement("a");
    link.href = `/api/projects/${id}/quick-report`;
    link.download = `${project?.name.replace(/[^a-z0-9]/gi, '_')}-status-report.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Status Report Started",
      description: "Your project status report PDF is downloading.",
    });
  }, [id, project?.name, toast]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filterState).filter((v) => v !== "all").length;
  }, [filterState]);

  const filteredOpenings = useMemo(() => {
    return openings.filter((opening) => {
      if (filterState.doorType !== "all" && opening.doorType !== filterState.doorType) {
        return false;
      }
      if (filterState.fireRating !== "all") {
        const fireRating = (opening as any).doorFireRating || (opening as any).frameFireRating || null;
        if (fireRating !== filterState.fireRating) {
          return false;
        }
      }
      if (filterState.hardwareGrade !== "all") {
        const hardwareGrade = (opening as any).hardwareGrade || null;
        if (hardwareGrade !== filterState.hardwareGrade) {
          return false;
        }
      }
      return true;
    });
  }, [openings, filterState]);

  // Show error state for project
  if (projectError) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <ErrorState
            title="Failed to load project"
            message={projectErrorObj instanceof Error ? projectErrorObj.message : "Unable to fetch project details. Please check your connection and try again."}
            error={projectErrorObj as Error}
            onRetry={refetchProject}
            testId="error-project"
            fullPage
          />
        </div>
      </div>
    );
  }

  // Show error state for openings
  if (openingsError) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <ErrorState
            title="Failed to load door openings"
            message={openingsErrorObj instanceof Error ? openingsErrorObj.message : "Unable to fetch door opening data. Please check your connection and try again."}
            error={openingsErrorObj as Error}
            onRetry={refetchOpenings}
            testId="error-openings"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (projectLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground ml-3">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link href="/projects">
            <Button variant="ghost" size="icon" data-testid="button-back" aria-label="Go back to projects" className="shrink-0 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-2xl font-semibold text-foreground leading-tight">{project.name}</h1>
              <Badge
                variant={project.status === "active" ? "default" : "secondary"}
                data-testid="badge-status"
                className="text-[10px] sm:text-xs"
              >
                {project.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 mt-1.5 sm:mt-2">
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-none">{project.location}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="capitalize">{project.buildingType}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <code className="px-2 py-0.5 rounded bg-muted truncate max-w-[120px]">{project.id}</code>
                <CopyButton text={project.id} label="Project ID" />
              </div>
            </div>
            {!isEditing && project.applicableStandards && project.applicableStandards.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Applicable Standards:</p>
                <div className="flex flex-wrap gap-2">
                  {project.applicableStandards.map((standard) => (
                    <Badge 
                      key={standard} 
                      variant="secondary"
                      data-testid={`badge-standard-${standard.toLowerCase().replace('/', '-')}`}
                    >
                      {standard}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Actions */}
            {!isEditing && (
              <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
                <Link href={`/projects/${id}/openings/new`}>
                  <Button variant="default" size="sm" data-testid="button-quick-add-opening">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Opening
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowPhotoUpload(true)}
                  data-testid="button-quick-upload-photo"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowQuoteUpload(true)}
                  data-testid="button-quick-upload-quote"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Quote
                </Button>
                <Link href={`/projects/${id}/engineering-review`}>
                  <Button variant="outline" size="sm" data-testid="button-quick-generate-quote">
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Quote
                  </Button>
                </Link>
                <Link href="/wiring-diagrams">
                  <Button variant="outline" size="sm" data-testid="button-quick-create-diagram">
                    <Zap className="h-4 w-4 mr-2" />
                    Create Wiring Diagram
                  </Button>
                </Link>
                <ScheduleSiteVisitDialog
                  projectId={project.id}
                  projectName={project.name}
                  projectLocation={project.location}
                />
                <Link href={`/projects/${id}/duplicate`}>
                  <Button variant="outline" size="sm" data-testid="button-duplicate-quote">
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate Quote
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => updateCosts.mutate()}
                  disabled={updateCosts.isPending}
                  data-testid="button-update-costs"
                >
                  {updateCosts.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Update Costs
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {!isEditing && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadQuickReport}
                  data-testid="button-quick-report"
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  <span className="hidden md:inline">Status</span> Report
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={exportToPDF}
                  data-testid="button-export-pdf"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  <span className="hidden md:inline">Export</span> PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-project"
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
                <Link href={`/projects/${id}/openings/new`}>
                  <Button size="sm" data-testid="button-add-opening">
                    <Plus className="h-4 w-4 mr-1.5" />
                    <span className="hidden sm:inline">Add</span> Opening
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-more-actions">
                      <Share2 className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">More</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Views</DropdownMenuLabel>
                    <Link href={`/projects/${id}/scope-of-work`}>
                      <DropdownMenuItem data-testid="menu-view-scope">
                        <FileText className="h-4 w-4 mr-2" />
                        Scope of Work
                      </DropdownMenuItem>
                    </Link>
                    <Link href={`/projects/${id}/costs`}>
                      <DropdownMenuItem data-testid="menu-view-costs">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Costs
                      </DropdownMenuItem>
                    </Link>
                    <Link href={`/projects/${id}/compliance`}>
                      <DropdownMenuItem data-testid="menu-view-compliance">
                        <Shield className="h-4 w-4 mr-2" />
                        Compliance
                      </DropdownMenuItem>
                    </Link>
                    <Link href={`/projects/${id}/hardware-schedule`}>
                      <DropdownMenuItem data-testid="menu-view-hardware-schedule">
                        <Ruler className="h-4 w-4 mr-2" />
                        Hardware Schedule
                      </DropdownMenuItem>
                    </Link>
                    <Link href={`/projects/${id}/floor-plans`}>
                      <DropdownMenuItem data-testid="menu-view-floor-plans">
                        <MapPin className="h-4 w-4 mr-2" />
                        Floor Plans
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Integrations</DropdownMenuLabel>
                    {quickbooksStatus?.connected && (
                      <DropdownMenuItem 
                        onClick={() => exportToQuickBooks.mutate()} 
                        disabled={exportToQuickBooks.isPending}
                        data-testid="menu-export-quickbooks"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Export to QuickBooks
                      </DropdownMenuItem>
                    )}
                    {docusignStatus?.connected && (
                      <DropdownMenuItem 
                        onClick={handleDocuSignSend}
                        disabled={sendToDocuSign.isPending}
                        data-testid="menu-send-docusign"
                      >
                        <FileSignature className="h-4 w-4 mr-2" />
                        Send for Signature
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Sync to Platform</DropdownMenuLabel>
                    {integrations.filter((i: any) => i.isActive === 'yes' && i.service === 'jira').length > 0 ? (
                      <DropdownMenuItem onClick={() => syncMutation.mutate({ service: 'jira' })} data-testid="menu-sync-jira">
                        Sync to Jira
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled data-testid="menu-sync-jira-disabled">
                        Jira (Not Configured)
                      </DropdownMenuItem>
                    )}
                    {integrations.filter((i: any) => i.isActive === 'yes' && i.service === 'confluence').length > 0 ? (
                      <DropdownMenuItem onClick={() => syncMutation.mutate({ service: 'confluence' })} data-testid="menu-sync-confluence">
                        Sync to Confluence
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled data-testid="menu-sync-confluence-disabled">
                        Confluence (Not Configured)
                      </DropdownMenuItem>
                    )}
                    {integrations.filter((i: any) => i.isActive === 'yes' && i.service === 'notion').length > 0 ? (
                      <DropdownMenuItem onClick={() => syncMutation.mutate({ service: 'notion' })} data-testid="menu-sync-notion">
                        Sync to Notion
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem disabled data-testid="menu-sync-notion-disabled">
                        Notion (Not Configured)
                      </DropdownMenuItem>
                    )}
                    {integrations.filter((i: any) => i.isActive === 'yes').length === 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <Link href="/integrations">
                          <DropdownMenuItem data-testid="menu-configure-integrations">
                            Configure Integrations
                          </DropdownMenuItem>
                        </Link>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Project Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Memorial Hospital Renovation"
                            data-testid="input-edit-project-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., 123 Main St, Springfield"
                            data-testid="input-edit-location"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer (Optional)</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset location when customer changes
                            if (value === "none") {
                              form.setValue("locationId", "");
                            }
                          }}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-customer">
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Customer</SelectItem>
                            {customers?.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedCustomerId && selectedCustomerId !== "none" && customerLocations && customerLocations.length > 0 && (
                    <FormField
                      control={form.control}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Location (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "none"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-location">
                                <SelectValue placeholder="Select a location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Location</SelectItem>
                              {customerLocations.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.locationName} - {location.city}, {location.state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="buildingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Building Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-building-type">
                              <SelectValue placeholder="Select building type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hospital">Hospital</SelectItem>
                            <SelectItem value="office">Office Building</SelectItem>
                            <SelectItem value="hotel">Hotel</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicableStandards"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Applicable Building Standards</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Select which codes and standards apply to this project
                          </p>
                        </div>
                        <div className="space-y-3">
                          {[
                            { id: "ADA", label: "ADA - Accessibility Standards", description: "Americans with Disabilities Act requirements" },
                            { id: "IBC", label: "IBC - International Building Code", description: "General building code requirements" },
                            { id: "NFPA", label: "NFPA - Fire Protection Standards", description: "Fire door and life safety requirements" },
                            { id: "ANSI/SDI", label: "ANSI/SDI - Steel Door & Frame", description: "Steel door and frame manufacturing standards" },
                            { id: "ANSI/BHMA", label: "ANSI/BHMA - Hardware Standards", description: "Door hardware performance standards" },
                            { id: "FGI", label: "FGI - Healthcare Facilities", description: "Hospital and healthcare-specific guidelines" },
                            { id: "NEC", label: "NEC - Electrical Code", description: "Electrical requirements for automation" },
                          ].map((standard) => (
                            <FormField
                              key={standard.id}
                              control={form.control}
                              name="applicableStandards"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={standard.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(standard.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), standard.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== standard.id
                                                )
                                              )
                                        }}
                                        data-testid={`checkbox-edit-standard-${standard.id.toLowerCase().replace('/', '-')}`}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="font-normal cursor-pointer">
                                        {standard.label}
                                      </FormLabel>
                                      <p className="text-sm text-muted-foreground">
                                        {standard.description}
                                      </p>
                                    </div>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any additional project information..."
                            className="min-h-24"
                            data-testid="input-edit-notes"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        form.reset();
                      }}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProject.isPending}
                      data-testid="button-save-project"
                    >
                      {updateProject.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {!isEditing && customer && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Customer Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium">{customer.name}</p>
                {customer.type && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {customer.type.replace(/-/g, ' ')}
                  </p>
                )}
              </div>
              {customer.contactName && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Contact: </span>
                  <span>{customer.contactName}</span>
                </div>
              )}
              {customer.preferredManufacturers && customer.preferredManufacturers.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Preferred Manufacturers:</p>
                  <div className="flex flex-wrap gap-1">
                    {customer.preferredManufacturers.map((mfr, idx) => (
                      <Badge key={idx} variant="secondary" data-testid={`badge-preferred-manufacturer-${idx}`}>
                        {mfr}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!isEditing && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Vendor Quotes ({vendorQuotes.length})</CardTitle>
                </div>
                {!showQuoteUpload && (
                  <Button
                    onClick={() => setShowQuoteUpload(true)}
                    size="sm"
                    data-testid="button-upload-vendor-quote"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Quote
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {showQuoteUpload && (
                <div className="mb-6 p-4 border rounded-md space-y-4">
                  <h3 className="text-sm font-medium">Upload Vendor Quote</h3>
                  
                  <Form {...quoteForm}>
                    <form onSubmit={quoteForm.handleSubmit((data) => uploadVendorQuote.mutate(data))} className="space-y-3">
                      <FormItem>
                        <FormLabel>
                          File <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            onChange={handleFileSelect}
                            accept=".pdf,.xlsx,.xls,.doc,.docx,.csv,.png,.jpg,.jpeg"
                            data-testid="input-quote-file"
                          />
                        </FormControl>
                        <FormDescription>
                          Supported: PDF, Excel, Word, CSV, PNG, JPEG (Max 10MB)
                        </FormDescription>
                      </FormItem>

                      <FormField
                        control={quoteForm.control}
                        name="vendorContactId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Vendor <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-vendor">
                                  <SelectValue placeholder="Select vendor" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {vendors.map((vendor) => (
                                  <SelectItem key={vendor.id} value={vendor.id}>
                                    {vendor.manufacturerName} - {vendor.contactName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                          control={quoteForm.control}
                          name="quoteNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quote Number</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value || ""}
                                  placeholder="Q-2025-001"
                                  data-testid="input-quote-number"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={quoteForm.control}
                          name="totalAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Amount</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value || ""}
                                  type="number"
                                  placeholder="0.00"
                                  data-testid="input-quote-amount"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={quoteForm.control}
                          name="quoteDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quote Date</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value || ""}
                                  type="date"
                                  data-testid="input-quote-date"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={quoteForm.control}
                          name="validUntil"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valid Until</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value || ""}
                                  type="date"
                                  data-testid="input-quote-valid-until"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={quoteForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="Brief description of the quote"
                                data-testid="input-quote-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={quoteForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                value={field.value || ""}
                                placeholder="Internal notes about this quote"
                                className="min-h-20"
                                data-testid="input-quote-notes"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowQuoteUpload(false);
                            setSelectedFile(null);
                            quoteForm.reset();
                          }}
                          data-testid="button-cancel-quote-upload"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={!selectedFile || uploadVendorQuote.isPending}
                          data-testid="button-submit-quote-upload"
                        >
                          {uploadVendorQuote.isPending ? "Uploading..." : "Upload Quote"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              )}

              {vendorQuotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No vendor quotes yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload quotes received from vendors for this project
                  </p>
                  {!showQuoteUpload && (
                    <Button
                      onClick={() => setShowQuoteUpload(true)}
                      data-testid="button-upload-first-quote"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload First Quote
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {vendorQuotes.map((quote) => {
                    const vendor = vendors.find((v) => v.id === quote.vendorContactId);
                    return (
                      <div
                        key={quote.id}
                        className="flex items-center justify-between p-3 border rounded-md"
                        data-testid={`vendor-quote-${quote.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium">{quote.fileName}</p>
                            <Badge variant="secondary" data-testid="badge-file-type">
                              {quote.fileType.toUpperCase()}
                            </Badge>
                            {quote.status && (
                              <Badge
                                variant={quote.status === "accepted" ? "default" : "secondary"}
                                data-testid="badge-quote-status"
                              >
                                {quote.status}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            {vendor && <p>Vendor: {vendor.manufacturerName} - {vendor.contactName}</p>}
                            {quote.quoteNumber && <p>Quote #: {quote.quoteNumber}</p>}
                            {quote.totalAmount && quote.totalAmount > 0 && (
                              <p>Amount: ${quote.totalAmount.toLocaleString()}</p>
                            )}
                            {quote.description && <p>{quote.description}</p>}
                            {quote.quoteDate && (
                              <p>Date: {new Date(quote.quoteDate).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadVendorQuote(quote.id, quote.fileName)}
                            data-testid={`button-download-quote-${quote.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this quote?")) {
                                deleteVendorQuote.mutate(quote.id);
                              }
                            }}
                            data-testid={`button-delete-quote-${quote.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!isEditing && linkedResources.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">External Coordination</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Linked resources created via integrations
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {linkedResources.map((resource: any) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                    data-testid={`linked-resource-${resource.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" data-testid={`badge-service-${resource.id}`}>
                          {resource.service === "google-calendar" ? "Google Calendar" : 
                           resource.service === "outlook-calendar" ? "Outlook Calendar" : 
                           resource.service === "github" ? "GitHub" :
                           resource.service === "jira" ? "Jira" :
                           resource.service === "confluence" ? "Confluence" :
                           resource.service.charAt(0).toUpperCase() + resource.service.slice(1)}
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-resource-type-${resource.id}`}>
                          {resource.resourceType}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{resource.title}</p>
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                          data-testid={`link-external-resource-${resource.id}`}
                        >
                          <ExternalLink className="h-3 w-3" />
                          View in {resource.service === "google-calendar" ? "Google Calendar" : 
                                   resource.service === "outlook-calendar" ? "Outlook Calendar" :
                                   resource.service === "github" ? "GitHub" :
                                   resource.service === "jira" ? "Jira" :
                                   resource.service === "confluence" ? "Confluence" :
                                   resource.service.charAt(0).toUpperCase() + resource.service.slice(1)}
                        </a>
                      )}
                      {resource.createdAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {new Date(resource.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (confirm("Are you sure you want to remove this linked resource?")) {
                          deleteLinkedResource.mutate(resource.id);
                        }
                      }}
                      data-testid={`button-delete-resource-${resource.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!isEditing && showPhotoUpload && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Upload Photo</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowPhotoUpload(false);
                    setSelectedPhotoFile(null);
                    setPhotoPreview(null);
                    photoForm.reset();
                  }}
                  data-testid="button-close-photo-upload"
                >
                  Cancel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...photoForm}>
                <form onSubmit={photoForm.handleSubmit((data) => uploadPhoto.mutate(data))} className="space-y-4">
                  <FormField
                    control={photoForm.control}
                    name="openingId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Door Opening <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-photo-opening">
                              <SelectValue placeholder="Select an opening" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {openings.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No openings available
                              </SelectItem>
                            ) : (
                              openings.map((opening) => (
                                <SelectItem key={opening.id} value={opening.id}>
                                  Opening {opening.openingNumber} - {opening.location}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the door opening this photo belongs to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={photoForm.control}
                    name="photoType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Photo Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-photo-type">
                              <SelectValue placeholder="Select photo type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="door-front">Door Front</SelectItem>
                            <SelectItem value="door-back">Door Back</SelectItem>
                            <SelectItem value="frame">Frame</SelectItem>
                            <SelectItem value="hardware">Hardware</SelectItem>
                            <SelectItem value="measurements">Measurements</SelectItem>
                            <SelectItem value="closeup">Close-up</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>
                      Photo <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        onChange={handlePhotoFileSelect}
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        data-testid="input-photo-file"
                      />
                    </FormControl>
                    <FormDescription>
                      Supported formats: PNG, JPEG, WebP (Max 10MB)
                    </FormDescription>
                  </FormItem>

                  {photoPreview && (
                    <div className="rounded-md overflow-hidden border">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-auto max-h-64 object-contain"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPhotoUpload(false);
                        setSelectedPhotoFile(null);
                        setPhotoPreview(null);
                        photoForm.reset();
                      }}
                      data-testid="button-cancel-photo-upload"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!selectedPhotoFile || uploadPhoto.isPending || openings.length === 0}
                      data-testid="button-submit-photo-upload"
                    >
                      {uploadPhoto.isPending ? "Uploading..." : "Upload Photo"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {!isEditing && project.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{project.notes}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Door Openings ({openings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {openingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Loading openings...</p>
              </div>
            ) : openings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DoorOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No door openings yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start adding door openings to this project with measurements and specifications
                </p>
                <Link href={`/projects/${id}/openings/new`}>
                  <Button data-testid="button-add-first-opening">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Opening
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <OpeningFilters
                  filters={filterState}
                  onFiltersChange={setFilterState}
                  activeFilterCount={activeFilterCount}
                />
                {filteredOpenings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-filtered-openings">
                    <DoorOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-1">No openings match filters</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Try adjusting or clearing your filters to see more openings.
                    </p>
                  </div>
                ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredOpenings.map((opening) => (
                  <Link key={opening.id} href={`/openings/${opening.id}`}>
                    <Card className="hover-elevate active-elevate-2 h-full" data-testid={`card-opening-${opening.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">
                            Opening {opening.openingNumber}
                          </CardTitle>
                          <DoorOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{opening.location}</span>
                        </div>
                        {opening.doorType && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span className="capitalize">{opening.doorType}</span>
                          </div>
                        )}
                        {(opening.doorWidth || opening.doorHeight) && (
                          <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                            <Ruler className="h-3 w-3" />
                            <span>
                              {opening.doorWidth && `W: ${opening.doorWidth}"`}
                              {opening.doorWidth && opening.doorHeight && " × "}
                              {opening.doorHeight && `H: ${opening.doorHeight}"`}
                            </span>
                          </div>
                        )}
                        {opening.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {opening.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
                </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Collaboration Section */}
        <Card data-testid="card-collaboration">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Collaboration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={collaborationTab} onValueChange={(value) => setCollaborationTab(value as "comments" | "activity")}>
              <TabsList className="grid w-full grid-cols-2" data-testid="tabs-collaboration">
                <TabsTrigger value="comments" className="flex items-center gap-2" data-testid="tab-comments">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2" data-testid="tab-activity">
                  <Activity className="h-4 w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="comments" className="mt-4">
                {collaborationTab === "comments" && (
                  isLoadingUser ? (
                    <div className="flex items-center justify-center py-8" data-testid="loading-user">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground ml-3">Loading user...</p>
                    </div>
                  ) : user ? (
                    <CommentsList
                      projectId={id!}
                      currentUser={{
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        profileImageUrl: user.profileImageUrl,
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="unauthenticated-message">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-1">Sign in to comment</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        You need to be signed in to view and add comments to this project.
                      </p>
                      <Link href="/login">
                        <Button data-testid="button-sign-in">
                          Sign In
                        </Button>
                      </Link>
                    </div>
                  )
                )}
              </TabsContent>
              
              <TabsContent value="activity" className="mt-4">
                {collaborationTab === "activity" && (
                  <ActivityTimeline projectId={id!} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Dialog open={showDocuSignSend} onOpenChange={setShowDocuSignSend}>
          <DialogContent data-testid="dialog-docusign-send">
            <DialogHeader>
              <DialogTitle>Send Quote for Signature</DialogTitle>
              <DialogDescription>
                Send this project quote to the customer for electronic signature via DocuSign
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name</label>
                <Input
                  value={customer?.name || ""}
                  disabled
                  data-testid="input-signer-name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={customer?.contactEmail || ""}
                  disabled
                  data-testid="input-signer-email"
                />
                {!customer?.contactEmail && (
                  <p className="text-sm text-destructive">
                    Please add an email address to the customer profile before sending for signature
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDocuSignSend(false)}
                data-testid="button-cancel-docusign"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (customer?.contactEmail && customer?.name) {
                    sendToDocuSign.mutate({
                      email: customer.contactEmail,
                      name: customer.name,
                    });
                  }
                }}
                disabled={!customer?.contactEmail || sendToDocuSign.isPending}
                data-testid="button-confirm-docusign"
              >
                {sendToDocuSign.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send for Signature"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
