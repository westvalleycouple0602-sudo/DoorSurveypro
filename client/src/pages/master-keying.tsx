import { apiRequest as fetch } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Key, 
  Trash2, 
  Edit, 
  Eye, 
  Download, 
  Search,
  Loader2,
  Building2,
  FileText,
  KeyRound,
  Lock,
  ChevronRight,
  Settings,
  Users,
  Grid3X3,
  TreePine,
  Factory,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  MASTER_KEY_MANUFACTURERS,
  KEY_LEVEL_TYPES,
  type MasterKeySystem,
  type MasterKeySystemData,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";

const createSystemSchema = z.object({
  name: z.string().min(1, "System name is required"),
  facilityName: z.string().min(1, "Facility name is required"),
  manufacturer: z.enum(["Allegion", "ASSA ABLOY", "dormakaba", "Medeco", "Best", "Other"]).nullable().optional(),
  projectId: z.string().optional().nullable(),
});

type CreateSystemFormValues = z.infer<typeof createSystemSchema>;

const keyLevelColors: Record<string, string> = {
  GMK: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  MK: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  SMK: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  CHANGE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CONSTRUCTION: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  VENDOR: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  SPECIAL: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

export default function MasterKeying() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<MasterKeySystem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [activeTab, setActiveTab] = useState("overview");

  const { 
    data: systems = [], 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery<MasterKeySystem[]>({
    queryKey: ["/api/master-keying/systems"],
  });

  const { data: manufacturers } = useQuery<{
    manufacturers: string[];
    presets: Record<string, { keyways: { name: string; notes: string }[] }>;
  }>({
    queryKey: ["/api/master-keying/manufacturers"],
  });

  const { data: keyLevels } = useQuery<{
    levels: { type: string; name: string; description: string }[];
  }>({
    queryKey: ["/api/master-keying/key-levels"],
  });

  const createForm = useForm<CreateSystemFormValues>({
    resolver: zodResolver(createSystemSchema),
    defaultValues: {
      name: "",
      facilityName: "",
      manufacturer: null,
      projectId: null,
    },
  });

  const createSystem = useMutation({
    mutationFn: async (values: CreateSystemFormValues) => {
      const now = new Date().toISOString();
      const payload = {
        ...values,
        organizationId: "", 
        data: {
          keyways: [],
          nodes: [],
          doorOpenings: [],
          assignments: [],
          brand: undefined,
          createdAt: now,
          updatedAt: now,
        },
      };
      const res = await apiRequest("POST", "/api/master-keying/systems", payload);
      return await res.json();
    },
    onSuccess: (newSystem) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-keying/systems"] });
      toast({
        title: "Success",
        description: "Master key system created successfully.",
      });
      setCreateDialogOpen(false);
      createForm.reset();
      setSelectedSystem(newSystem);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to create system",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteSystem = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/master-keying/systems/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-keying/systems"] });
      toast({
        title: "Success",
        description: "Master key system deleted successfully.",
      });
      if (selectedSystem) {
        setSelectedSystem(null);
      }
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to delete system",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateSystem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MasterKeySystem> }) => {
      const res = await apiRequest("PATCH", `/api/master-keying/systems/${id}`, updates);
      return await res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-keying/systems"] });
      setSelectedSystem(updated);
      toast({
        title: "Success",
        description: "System updated successfully.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update system",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (values: CreateSystemFormValues) => {
    createSystem.mutate(values);
  };

  const filteredSystems = useMemo(() => {
    if (!debouncedSearch) return systems;
    const search = debouncedSearch.toLowerCase();
    return systems.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        s.facilityName.toLowerCase().includes(search) ||
        s.manufacturer?.toLowerCase().includes(search)
    );
  }, [systems, debouncedSearch]);

  const handleExport = async (systemId: string, view: "internal" | "customer") => {
    try {
      const res = await fetch(`/api/master-keying/systems/${systemId}/export?view=${view}`);
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `master-key-system-${view}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export Complete",
        description: `${view === "customer" ? "Customer" : "Internal"} view exported successfully.`,
      });
    } catch (err) {
      toast({
        title: "Export Failed",
        description: "Unable to export system data.",
        variant: "destructive",
      });
    }
  };

  if (isError) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <ErrorState
          title="Failed to load master key systems"
          message={error instanceof Error ? error.message : "Unable to fetch data."}
          error={error as Error}
          onRetry={refetch}
          testId="error-master-keying"
          fullPage
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Skeleton className="h-9 w-72 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={`skel-${i}`} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const selectedData = selectedSystem?.data as MasterKeySystemData | undefined;

  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="heading-master-keying">
            <KeyRound className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            Master Keying
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Design and manage hierarchical keying systems for commercial facilities
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shrink-0" data-testid="button-create-system">
              <Plus className="mr-1.5 h-4 w-4" />
              <span className="text-xs sm:text-sm">New System</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Master Key System</DialogTitle>
              <DialogDescription>
                Set up a new hierarchical keying system for a facility
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>System Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Building A Master System"
                          data-testid="input-system-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="facilityName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Corporate Headquarters"
                          data-testid="input-facility-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={(val) => field.onChange(val || null)}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-manufacturer">
                            <SelectValue placeholder="Select manufacturer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(MASTER_KEY_MANUFACTURERS).map((mfr) => (
                            <SelectItem key={mfr} value={mfr}>
                              {mfr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createSystem.isPending}>
                    {createSystem.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create System
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        <div className="lg:col-span-1 space-y-3 sm:space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search systems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
              data-testid="input-search-systems"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2 pr-4">
              {filteredSystems.length === 0 ? (
                <Card className="p-4 sm:p-6 text-center">
                  <KeyRound className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {searchTerm ? "No matching systems found" : "No master key systems yet"}
                  </p>
                  {!searchTerm && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 sm:mt-4"
                      onClick={() => setCreateDialogOpen(true)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      <span className="text-xs sm:text-sm">Create First System</span>
                    </Button>
                  )}
                </Card>
              ) : (
                filteredSystems.map((system) => {
                  const data = system.data as MasterKeySystemData | undefined;
                  const nodeCount = data?.nodes?.length || 0;
                  const keywayCount = data?.keyways?.length || 0;
                  
                  return (
                    <Card
                      key={system.id}
                      className={`cursor-pointer transition-colors hover-elevate ${
                        selectedSystem?.id === system.id
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => setSelectedSystem(system)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedSystem(system); }}
                      tabIndex={0}
                      role="button"
                      data-testid={`card-system-${system.id}`}
                    >
                      <CardHeader className="p-3 sm:p-4 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm sm:text-base truncate">
                              {system.name}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm truncate">
                              {system.facilityName}
                            </CardDescription>
                          </div>
                          {system.manufacturer && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              {system.manufacturer}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0 pb-3">
                        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <span className="flex items-center gap-1 min-w-0">
                            <TreePine className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                            <span>{nodeCount} keys</span>
                          </span>
                          <span className="flex items-center gap-1 min-w-0">
                            <Key className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                            <span>{keywayCount} keyways</span>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="lg:col-span-2">
          {selectedSystem ? (
            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-2">
                      <span className="truncate">{selectedSystem.name}</span>
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-xs sm:text-sm">
                      <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span className="truncate">{selectedSystem.facilityName}</span>
                      {selectedSystem.manufacturer && (
                        <>
                          <span className="text-muted-foreground shrink-0">·</span>
                          <Factory className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span>{selectedSystem.manufacturer}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(selectedSystem.id, "internal")}
                      data-testid="button-export-internal"
                    >
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline text-xs sm:text-sm">Internal</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExport(selectedSystem.id, "customer")}
                      data-testid="button-export-customer"
                    >
                      <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline text-xs sm:text-sm">Customer</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Delete this master key system?")) {
                          deleteSystem.mutate(selectedSystem.id);
                        }
                      }}
                      aria-label="Delete master key system"
                      data-testid="button-delete-system"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" data-testid="tab-overview">
                      <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">Overview</span>
                      <span className="sm:hidden">View</span>
                    </TabsTrigger>
                    <TabsTrigger value="hierarchy" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" data-testid="tab-hierarchy">
                      <TreePine className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">Hierarchy</span>
                      <span className="sm:hidden">Keys</span>
                    </TabsTrigger>
                    <TabsTrigger value="keyways" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" data-testid="tab-keyways">
                      <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">Keyways</span>
                      <span className="sm:hidden">Ways</span>
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2" data-testid="tab-settings">
                      <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">Settings</span>
                      <span className="sm:hidden">Set</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    <SystemOverview 
                      system={selectedSystem} 
                      data={selectedData}
                      keyLevels={keyLevels?.levels}
                    />
                  </TabsContent>

                  <TabsContent value="hierarchy" className="mt-4">
                    <HierarchyBuilder
                      system={selectedSystem}
                      data={selectedData}
                      onUpdate={(updates) => 
                        updateSystem.mutate({ id: selectedSystem.id, updates })
                      }
                      isPending={updateSystem.isPending}
                    />
                  </TabsContent>

                  <TabsContent value="keyways" className="mt-4">
                    <KeywaysEditor
                      system={selectedSystem}
                      data={selectedData}
                      manufacturerPresets={manufacturers?.presets}
                      onUpdate={(updates) =>
                        updateSystem.mutate({ id: selectedSystem.id, updates })
                      }
                      isPending={updateSystem.isPending}
                    />
                  </TabsContent>

                  <TabsContent value="settings" className="mt-4">
                    <BrandSettings
                      system={selectedSystem}
                      data={selectedData}
                      onUpdate={(updates) =>
                        updateSystem.mutate({ id: selectedSystem.id, updates })
                      }
                      isPending={updateSystem.isPending}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center p-6 sm:p-8 lg:p-12">
              <div className="text-center">
                <KeyRound className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">Select a System</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                  Choose a master key system from the list to view and edit its
                  hierarchy, keyways, and configuration settings.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SystemOverview({ 
  system, 
  data,
  keyLevels,
}: { 
  system: MasterKeySystem; 
  data?: MasterKeySystemData;
  keyLevels?: { type: string; name: string; description: string }[];
}) {
  const nodesByLevel = useMemo(() => {
    if (!data?.nodes) return {};
    return data.nodes.reduce((acc, node) => {
      const level = node.levelType || "UNKNOWN";
      if (!acc[level]) acc[level] = [];
      acc[level].push(node);
      return acc;
    }, {} as Record<string, typeof data.nodes>);
  }, [data?.nodes]);

  const stats = useMemo(() => ({
    totalKeys: data?.nodes?.length || 0,
    keyways: data?.keyways?.length || 0,
    doorOpenings: data?.doorOpenings?.length || 0,
    assignments: data?.assignments?.length || 0,
  }), [data]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardDescription className="text-xs sm:text-sm">Total Keys</CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">{stats.totalKeys}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardDescription className="text-xs sm:text-sm">Keyways</CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">{stats.keyways}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardDescription className="text-xs sm:text-sm">Door Openings</CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">{stats.doorOpenings}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardDescription className="text-xs sm:text-sm">Assignments</CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">{stats.assignments}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold">Key Hierarchy</h3>
        {Object.keys(nodesByLevel).length === 0 ? (
          <p className="text-muted-foreground text-xs sm:text-sm">
            No keys defined yet. Use the Hierarchy tab to build your keying structure.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {Object.entries(KEY_LEVEL_TYPES).map(([key, value]) => {
              const nodes = nodesByLevel[value] || [];
              if (nodes.length === 0) return null;
              
              return (
                <Card key={key}>
                  <CardHeader className="p-3 sm:p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={`shrink-0 text-xs ${keyLevelColors[value] || "bg-gray-100"}`}>
                        {value}
                      </Badge>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {nodes.length} key{nodes.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    <div className="space-y-1">
                      {nodes.slice(0, 5).map((node) => (
                        <div
                          key={node.id}
                          className="text-xs sm:text-sm flex items-center gap-2 min-w-0"
                        >
                          <span className="font-mono shrink-0">{node.code}</span>
                          <span className="text-muted-foreground truncate">
                            {node.fullName}
                          </span>
                        </div>
                      ))}
                      {nodes.length > 5 && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          +{nodes.length - 5} more
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function HierarchyBuilder({
  system,
  data,
  onUpdate,
  isPending,
}: {
  system: MasterKeySystem;
  data?: MasterKeySystemData;
  onUpdate: (updates: Partial<MasterKeySystem>) => void;
  isPending: boolean;
}) {
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [newNode, setNewNode] = useState({
    code: "",
    fullName: "",
    levelType: "CHANGE" as string,
    parentId: "",
    bitting: "",
    notes: "",
  });

  const handleAddNode = () => {
    if (!newNode.code || !newNode.fullName) return;

    const nodeId = `node-${Date.now()}`;
    const existingNodes = data?.nodes || [];
    
    const node = {
      id: nodeId,
      systemId: system.id,
      code: newNode.code,
      fullName: newNode.fullName,
      levelType: newNode.levelType,
      parentId: newNode.parentId || undefined,
      childrenIds: [] as string[],
      bitting: newNode.bitting || undefined,
      notes: newNode.notes || undefined,
    };

    const updatedNodes = [...existingNodes, node];

    if (newNode.parentId) {
      const parentIndex = updatedNodes.findIndex((n) => n.id === newNode.parentId);
      if (parentIndex >= 0) {
        updatedNodes[parentIndex] = {
          ...updatedNodes[parentIndex],
          childrenIds: [...(updatedNodes[parentIndex].childrenIds || []), nodeId],
        };
      }
    }

    onUpdate({
      data: {
        ...(data || {
          keyways: [],
          doorOpenings: [],
          assignments: [],
          createdAt: new Date().toISOString(),
        }),
        nodes: updatedNodes,
        updatedAt: new Date().toISOString(),
      } as MasterKeySystemData,
    });

    setNewNode({
      code: "",
      fullName: "",
      levelType: "CHANGE",
      parentId: "",
      bitting: "",
      notes: "",
    });
    setAddNodeOpen(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    const existingNodes = data?.nodes || [];
    const updatedNodes = existingNodes
      .filter((n) => n.id !== nodeId)
      .map((n) => ({
        ...n,
        childrenIds: n.childrenIds.filter((id) => id !== nodeId),
      }));

    onUpdate({
      data: {
        ...(data || {
          keyways: [],
          doorOpenings: [],
          assignments: [],
          createdAt: new Date().toISOString(),
        }),
        nodes: updatedNodes,
        updatedAt: new Date().toISOString(),
      } as MasterKeySystemData,
    });
  };

  const rootNodes = useMemo(() => {
    return (data?.nodes || []).filter((n) => !n.parentId);
  }, [data?.nodes]);

  const getChildren = (parentId: string) => {
    return (data?.nodes || []).filter((n) => n.parentId === parentId);
  };

  const renderNode = (node: NonNullable<MasterKeySystemData["nodes"]>[number], depth = 0) => {
    const children = getChildren(node.id);
    
    return (
      <div key={node.id} style={{ marginLeft: depth * 16 }} className="sm:ml-0" data-depth={depth}>
        <div className="flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-3 rounded-md hover:bg-accent/50 min-w-0" style={{ marginLeft: depth * 8 }}>
          {children.length > 0 && (
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          )}
          <Badge className={`shrink-0 text-xs ${keyLevelColors[node.levelType] || "bg-gray-100"}`}>
            {node.levelType}
          </Badge>
          <span className="font-mono text-xs sm:text-sm shrink-0">{node.code}</span>
          <span className="text-xs sm:text-sm text-muted-foreground truncate flex-1 min-w-0">
            {node.fullName}
          </span>
          {node.bitting && (
            <span className="text-xs font-mono text-muted-foreground shrink-0 hidden sm:inline">
              [{node.bitting}]
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => handleDeleteNode(node.id)}
            aria-label="Delete key"
            data-testid={`button-delete-key-${node.id}`}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
        {children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold">Key Hierarchy</h3>
        <Dialog open={addNodeOpen} onOpenChange={setAddNodeOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-key">
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="text-xs sm:text-sm">Add Key</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Add Key to Hierarchy</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Create a new key in the master key system hierarchy
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium">Key Code</label>
                  <Input
                    value={newNode.code}
                    onChange={(e) =>
                      setNewNode({ ...newNode, code: e.target.value })
                    }
                    placeholder="e.g., GMK-1, MK-A"
                    className="text-sm"
                    data-testid="input-key-code"
                  />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium">Level Type</label>
                  <Select
                    value={newNode.levelType}
                    onValueChange={(val) =>
                      setNewNode({ ...newNode, levelType: val })
                    }
                  >
                    <SelectTrigger data-testid="select-level-type" className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(KEY_LEVEL_TYPES).map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {lvl}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium">Full Name</label>
                <Input
                  value={newNode.fullName}
                  onChange={(e) =>
                    setNewNode({ ...newNode, fullName: e.target.value })
                  }
                  placeholder="e.g., Grand Master Key - Main Building"
                  className="text-sm"
                  data-testid="input-key-full-name"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium">Parent Key</label>
                <Select
                  value={newNode.parentId}
                  onValueChange={(val) =>
                    setNewNode({ ...newNode, parentId: val })
                  }
                >
                  <SelectTrigger data-testid="select-parent-key" className="text-sm">
                    <SelectValue placeholder="None (Root Level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Root Level)</SelectItem>
                    {(data?.nodes || []).map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.code} - {n.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium">Bitting (Optional)</label>
                <Input
                  value={newNode.bitting}
                  onChange={(e) =>
                    setNewNode({ ...newNode, bitting: e.target.value })
                  }
                  placeholder="e.g., 123456"
                  className="text-sm"
                  data-testid="input-bitting"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium">Notes</label>
                <Textarea
                  value={newNode.notes}
                  onChange={(e) =>
                    setNewNode({ ...newNode, notes: e.target.value })
                  }
                  placeholder="Optional notes..."
                  rows={2}
                  className="text-sm"
                  data-testid="input-key-notes"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setAddNodeOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNode}
                disabled={!newNode.code || !newNode.fullName || isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4">
          {rootNodes.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <TreePine className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No keys defined yet</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Start by adding a Grand Master Key (GMK) or Master Key (MK)
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {rootNodes.map((node) => renderNode(node))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KeywaysEditor({
  system,
  data,
  manufacturerPresets,
  onUpdate,
  isPending,
}: {
  system: MasterKeySystem;
  data?: MasterKeySystemData;
  manufacturerPresets?: Record<string, { keyways: { name: string; notes: string }[] }>;
  onUpdate: (updates: Partial<MasterKeySystem>) => void;
  isPending: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [newKeyway, setNewKeyway] = useState({
    name: "",
    manufacturer: system.manufacturer || "",
    notes: "",
  });

  const handleAddKeyway = () => {
    if (!newKeyway.name) return;

    const keywayId = `keyway-${Date.now()}`;
    const existingKeyways = data?.keyways || [];

    onUpdate({
      data: {
        ...(data || {
          nodes: [],
          doorOpenings: [],
          assignments: [],
          createdAt: new Date().toISOString(),
        }),
        keyways: [
          ...existingKeyways,
          {
            id: keywayId,
            name: newKeyway.name,
            manufacturer: newKeyway.manufacturer,
            notes: newKeyway.notes || undefined,
          },
        ],
        updatedAt: new Date().toISOString(),
      } as MasterKeySystemData,
    });

    setNewKeyway({ name: "", manufacturer: system.manufacturer || "", notes: "" });
    setAddOpen(false);
  };

  const handleDeleteKeyway = (keywayId: string) => {
    const existingKeyways = data?.keyways || [];

    onUpdate({
      data: {
        ...(data || {
          nodes: [],
          doorOpenings: [],
          assignments: [],
          createdAt: new Date().toISOString(),
        }),
        keyways: existingKeyways.filter((k) => k.id !== keywayId),
        updatedAt: new Date().toISOString(),
      } as MasterKeySystemData,
    });
  };

  const presets =
    system.manufacturer && manufacturerPresets?.[system.manufacturer]?.keyways;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold">Keyways</h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-keyway">
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="text-xs sm:text-sm">Add Keyway</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Add Keyway</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Define a keyway configuration for this system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              {presets && presets.length > 0 && (
                <div>
                  <label className="text-xs sm:text-sm font-medium">Quick Select</label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                    {presets.map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        className="text-xs sm:text-sm"
                        onClick={() =>
                          setNewKeyway({
                            ...newKeyway,
                            name: preset.name,
                            notes: preset.notes,
                          })
                        }
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs sm:text-sm font-medium">Keyway Name</label>
                <Input
                  value={newKeyway.name}
                  onChange={(e) =>
                    setNewKeyway({ ...newKeyway, name: e.target.value })
                  }
                  placeholder="e.g., Schlage C, Yale 8"
                  className="text-sm"
                  data-testid="input-keyway-name"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium">Manufacturer</label>
                <Input
                  value={newKeyway.manufacturer}
                  onChange={(e) =>
                    setNewKeyway({ ...newKeyway, manufacturer: e.target.value })
                  }
                  placeholder="e.g., Allegion"
                  className="text-sm"
                  data-testid="input-keyway-manufacturer"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium">Notes</label>
                <Textarea
                  value={newKeyway.notes}
                  onChange={(e) =>
                    setNewKeyway({ ...newKeyway, notes: e.target.value })
                  }
                  placeholder="Optional notes..."
                  rows={2}
                  className="text-sm"
                  data-testid="input-keyway-notes"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddKeyway}
                disabled={!newKeyway.name || isPending}
              >
                Add Keyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4">
          {(data?.keyways?.length || 0) === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Key className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No keyways defined yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.keyways?.map((keyway) => (
                <div
                  key={keyway.id}
                  className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-md border min-w-0"
                  data-testid={`row-keyway-${keyway.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base truncate" data-testid={`text-keyway-name-${keyway.id}`}>{keyway.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {keyway.manufacturer}
                      {keyway.notes && ` · ${keyway.notes}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleDeleteKeyway(keyway.id)}
                    aria-label="Delete keyway"
                    data-testid={`button-delete-keyway-${keyway.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BrandSettings({
  system,
  data,
  onUpdate,
  isPending,
}: {
  system: MasterKeySystem;
  data?: MasterKeySystemData;
  onUpdate: (updates: Partial<MasterKeySystem>) => void;
  isPending: boolean;
}) {
  const brand = data?.brand;

  const handleToggle = (field: keyof NonNullable<MasterKeySystemData["brand"]>) => {
    const currentBrand = data?.brand || {
      orgName: "",
      primaryColor: "#000000",
      secondaryColor: "#ffffff",
      termsAndConditions: "",
    };

    onUpdate({
      data: {
        ...(data || {
          keyways: [],
          nodes: [],
          doorOpenings: [],
          assignments: [],
          createdAt: new Date().toISOString(),
        }),
        brand: {
          ...currentBrand,
          [field]: !currentBrand[field],
        },
        updatedAt: new Date().toISOString(),
      } as MasterKeySystemData,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Customer View Redactions</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
          Control what information is visible when exporting for customer view
        </p>

        <Card>
          <CardContent className="p-3 sm:p-4 pt-3 sm:pt-4 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm sm:text-base">Hide Bitting Codes</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Redact key bitting information on customer exports
                </p>
              </div>
              <Switch
                checked={brand?.hideBittingOnCustomerView || false}
                onCheckedChange={() => handleToggle("hideBittingOnCustomerView")}
                disabled={isPending}
                className="shrink-0"
                data-testid="switch-hide-bitting"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm sm:text-base">Hide Keyway Details</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Hide keyway identifiers on customer exports
                </p>
              </div>
              <Switch
                checked={brand?.hideKeywayOnCustomerView || false}
                onCheckedChange={() => handleToggle("hideKeywayOnCustomerView")}
                disabled={isPending}
                className="shrink-0"
                data-testid="switch-hide-keyway"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm sm:text-base">Hide Manufacturer Names</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Remove manufacturer branding from customer exports
                </p>
              </div>
              <Switch
                checked={brand?.hideManufacturerNamesOnCustomerView || false}
                onCheckedChange={() =>
                  handleToggle("hideManufacturerNamesOnCustomerView")
                }
                disabled={isPending}
                className="shrink-0"
                data-testid="switch-hide-manufacturer"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-start gap-2 p-3 sm:p-4 rounded-lg border bg-muted/50">
        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-muted-foreground">
          Use the "Customer" export button to preview how the system appears
          with these redactions applied.
        </p>
      </div>
    </div>
  );
}
