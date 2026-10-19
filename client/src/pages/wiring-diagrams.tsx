import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Zap, 
  Cable, 
  DoorClosed, 
  Fingerprint, 
  Eye, 
  Download, 
  Upload, 
  Search, 
  Loader2, 
  X, 
  Building2, 
  MapPin, 
  FileBox,
  Power,
  Network
} from "lucide-react";

const createDiagramSchema = z.object({
  name: z.string().min(1, "Diagram name is required"),
  description: z.string().optional(),
  diagramType: z.enum(["access-control", "automation", "power", "complete-integration"]),
});

interface WiringDiagram {
  id: string;
  name: string;
  description: string | null;
  diagramType: string;
  createdAt: string;
}

const getDiagramTypeConfig = (diagramType: string) => {
  const configs: Record<string, { label: string; icon: any; color: string }> = {
    "access-control": { label: "Access Control", icon: Fingerprint, color: "text-blue-500" },
    "automation": { label: "Automation", icon: DoorClosed, color: "text-orange-500" },
    "power": { label: "Power Distribution", icon: Power, color: "text-yellow-500" },
    "complete-integration": { label: "Complete Integration", icon: Network, color: "text-purple-500" },
  };
  return configs[diagramType] || { label: diagramType, icon: Cable, color: "text-gray-500" };
};

export default function WiringDiagrams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newDiagramOpen, setNewDiagramOpen] = useState(false);
  const [selectedDiagram, setSelectedDiagram] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Form for new diagram
  const form = useForm<z.infer<typeof createDiagramSchema>>({
    resolver: zodResolver(createDiagramSchema),
    defaultValues: {
      name: "",
      description: "",
      diagramType: "access-control",
    },
  });

  const { data: diagrams, isLoading, isError, error, refetch } = useQuery<WiringDiagram[]>({
    queryKey: [`/api/wiring-diagrams?organizationId=${user?.organization?.id}`],
    enabled: !!user?.organization?.id,
  });

  const createDiagramMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createDiagramSchema>) => {
      if (!user?.organization?.id) {
        throw new Error("No organization found");
      }
      return await apiRequest("POST", "/api/wiring-diagrams", {
        ...data,
        organizationId: user.organization.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wiring-diagrams?organizationId=${user?.organization?.id}`] });
      setNewDiagramOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Wiring diagram created successfully. You can now add devices and connections to the diagram.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create wiring diagram",
        description: error.message || "Unable to create diagram. Please verify all fields and try again.",
        variant: "destructive",
      });
    },
  });

  const deleteDiagramMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.organization?.id) {
        throw new Error("No organization found");
      }
      return await apiRequest("DELETE", `/api/wiring-diagrams/${id}?organizationId=${user.organization.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wiring-diagrams?organizationId=${user?.organization?.id}`] });
      toast({
        title: "Success",
        description: "Wiring diagram deleted successfully. All diagram data and connections have been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete wiring diagram",
        description: error.message || "Unable to remove diagram. It may be associated with active projects or door openings.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof createDiagramSchema>) => {
    createDiagramMutation.mutate(data);
  };

  const handleDeleteDiagram = (id: string) => {
    if (confirm("Are you sure you want to delete this diagram?")) {
      deleteDiagramMutation.mutate(id);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6">
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Authentication Required</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Please log in to access wiring diagrams</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6">
        <ErrorState
          title="Failed to load wiring diagrams"
          message={error instanceof Error ? error.message : "Unable to fetch wiring diagram data. Please check your connection and try again."}
          error={error as Error}
          onRetry={refetch}
          testId="error-wiring-diagrams"
          fullPage
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6 flex flex-col items-center justify-center py-8 sm:py-12">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mb-2 sm:mb-3 text-muted-foreground" />
        <p className="text-xs sm:text-sm text-muted-foreground">Loading wiring diagrams...</p>
      </div>
    );
  }

  const filteredDiagrams = diagrams?.filter((diagram) => {
    if (!debouncedSearch) return true;
    return (
      diagram.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      diagram.description?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      getDiagramTypeConfig(diagram.diagramType).label.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }) || [];

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
              <Cable className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold" data-testid="heading-wiring-diagrams">Wiring Diagrams</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
                Create and manage access control and automation wiring diagrams
              </p>
            </div>
          </div>
          <Dialog open={newDiagramOpen} onOpenChange={setNewDiagramOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-diagram" className="w-full sm:w-auto text-xs sm:text-sm shrink-0">
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                New Diagram
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-3 sm:mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileBox className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  Create Wiring Diagram
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a new access control or automation wiring diagram
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Diagram Name</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-diagram-name"
                          placeholder="e.g., Main Entrance Card Access"
                          className="text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="input-diagram-description"
                          placeholder="Brief description of the wiring configuration"
                          className="text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diagramType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Diagram Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-diagram-type" className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="access-control">
                            <div className="flex items-center gap-2 text-sm">
                              <Fingerprint className="h-3 w-3 shrink-0" />
                              Access Control
                            </div>
                          </SelectItem>
                          <SelectItem value="automation">
                            <div className="flex items-center gap-2 text-sm">
                              <DoorClosed className="h-3 w-3 shrink-0" />
                              Automation
                            </div>
                          </SelectItem>
                          <SelectItem value="power">
                            <div className="flex items-center gap-2 text-sm">
                              <Power className="h-3 w-3 shrink-0" />
                              Power Distribution
                            </div>
                          </SelectItem>
                          <SelectItem value="complete-integration">
                            <div className="flex items-center gap-2 text-sm">
                              <Network className="h-3 w-3 shrink-0" />
                              Complete Integration
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setNewDiagramOpen(false)} data-testid="button-cancel" className="w-full sm:w-auto text-xs sm:text-sm">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createDiagramMutation.isPending}
                    data-testid="button-save-diagram"
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    {createDiagramMutation.isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                        Create Diagram
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
        
        {/* Search Input */}
        <div className="relative max-w-full sm:max-w-md">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            placeholder="Search wiring diagrams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 sm:pl-9 text-sm"
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Diagrams Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground" data-testid="loading-state">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mb-2 sm:mb-3" />
          <p className="text-xs sm:text-sm">Loading wiring diagrams...</p>
        </div>
      ) : filteredDiagrams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredDiagrams.map((diagram) => {
            const typeConfig = getDiagramTypeConfig(diagram.diagramType);
            const TypeIcon = typeConfig.icon;
            
            return (
              <Card
                key={diagram.id}
                className="hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => setSelectedDiagram(diagram.id)}
                data-testid={`card-diagram-${diagram.id}`}
              >
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-1.5 sm:gap-2">
                        <Cable className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{diagram.name}</span>
                      </CardTitle>
                      <div className="mt-1.5 sm:mt-2">
                        <Badge variant="outline" className="text-[10px] sm:text-xs" data-testid={`badge-type-${diagram.diagramType}`}>
                          <TypeIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 shrink-0" />
                          {typeConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <TypeIcon className={`h-4 w-4 sm:h-5 sm:w-5 shrink-0 ${typeConfig.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {diagram.description || "No description"}
                  </p>
                  <div className="flex justify-between items-center mt-3 sm:mt-4 pt-3 sm:pt-4 border-t gap-2">
                    <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                      {new Date(diagram.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-0.5 sm:gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => setSelectedDiagram(diagram.id)}
                            aria-label="View diagram"
                            data-testid={`button-view-diagram-${diagram.id}`}
                          >
                            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Diagram</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => handleDeleteDiagram(diagram.id)}
                            aria-label="Delete diagram"
                            data-testid={`button-delete-diagram-${diagram.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Diagram</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card data-testid="empty-state">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Cable className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              No Wiring Diagrams
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {searchTerm ? "No diagrams match your search. Try different keywords." : "Get started by creating your first wiring diagram"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 px-3 sm:px-6">
            <div className="relative mb-4 sm:mb-6">
              <Cable className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/40" />
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-primary absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2" />
            </div>
            {!searchTerm && (
              <>
                <p className="text-xs sm:text-sm text-muted-foreground text-center mb-3 sm:mb-4 max-w-md">
                  Create professional access control and automation wiring diagrams <br className="hidden sm:block" />
                  with drag-and-drop components, wire specifications, and annotations
                </p>
                <Button size="sm" className="text-xs sm:text-sm" onClick={() => setNewDiagramOpen(true)} data-testid="button-create-first">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                  Create First Diagram
                </Button>
              </>
            )}
            {searchTerm && (
              <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => setSearchTerm("")} data-testid="button-clear-search">
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diagram Editor (placeholder for now) */}
      {selectedDiagram && (
        <Dialog open={!!selectedDiagram} onOpenChange={() => setSelectedDiagram(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[85vh] sm:h-[80vh] mx-2 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Cable className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Wiring Diagram Editor
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Diagram editor coming soon - drag-and-drop components, wire connections, and annotations
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg p-3 sm:p-4">
              <div className="text-center space-y-3 sm:space-y-4">
                <div className="relative inline-block">
                  <Cable className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/40 mx-auto" />
                  <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-primary absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2" />
                </div>
                <h3 className="text-base sm:text-xl font-semibold flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin shrink-0" />
                  Canvas Editor In Progress
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md px-2 sm:px-0">
                  The diagram editor with drag-and-drop components, wire drawing,
                  and annotation tools is currently under development.
                </p>
                <div className="flex flex-wrap gap-2 justify-center pt-2 sm:pt-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" disabled aria-label="Download diagram (coming soon)">
                        <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download (Coming Soon)</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" disabled aria-label="Upload diagram (coming soon)">
                        <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Upload (Coming Soon)</TooltipContent>
                  </Tooltip>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => setSelectedDiagram(null)} data-testid="button-close-editor">
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
