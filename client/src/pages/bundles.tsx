import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Package, Trash2, Eye, Edit, Loader2, Search, X, FileText } from "lucide-react";
import {
  insertHardwareBundleSchema,
  insertBundleItemSchema,
  type InsertHardwareBundle,
  type InsertBundleItem,
  type HardwareBundle,
  type BundleItem,
  type BomTemplate,
  type BomTemplateItem,
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { ErrorState } from "@/components/error-state";

const HARDWARE_TYPES = [
  { value: "hinge", label: "Hinge" },
  { value: "lock", label: "Lock" },
  { value: "closer", label: "Closer" },
  { value: "exit-device", label: "Exit Device" },
  { value: "flush-bolt", label: "Flush Bolt" },
  { value: "coordinator", label: "Coordinator" },
  { value: "stop", label: "Stop" },
  { value: "weatherstripping", label: "Weatherstripping" },
  { value: "threshold", label: "Threshold" },
  { value: "astragal", label: "Astragal" },
  { value: "viewer", label: "Viewer" },
  { value: "kickplate", label: "Kick Plate" },
  { value: "push-plate", label: "Push Plate" },
  { value: "pull-handle", label: "Pull Handle" },
  { value: "sensor", label: "Sensor" },
  { value: "reader", label: "Reader" },
  { value: "actuator", label: "Actuator" },
  { value: "push-button-activator", label: "Push Button Activator" },
  { value: "access-control-peripheral", label: "Access Control Peripheral" },
  { value: "request-to-exit", label: "Request to Exit" },
  { value: "door-contact", label: "Door Contact" },
  { value: "power-supply", label: "Power Supply" },
  { value: "other", label: "Other" },
];

export default function Bundles() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<HardwareBundle | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BundleItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [activeTab, setActiveTab] = useState("bundles");
  const [selectedTemplate, setSelectedTemplate] = useState<BomTemplate | null>(null);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);

  const { data: bundles = [], isLoading, isError, error, refetch } = useQuery<HardwareBundle[]>({
    queryKey: ["/api/bundles"],
  });

  const { data: bundleItems = [] } = useQuery<BundleItem[]>({
    queryKey: ["/api/bundles", selectedBundle?.id, "items"],
    enabled: !!selectedBundle?.id,
  });

  const { data: bomTemplates = [], isLoading: templatesLoading } = useQuery<BomTemplate[]>({
    queryKey: ["/api/bom-templates"],
  });

  const { 
    data: templateItems = [], 
    isLoading: templateItemsLoading,
    error: templateItemsError 
  } = useQuery<BomTemplateItem[]>({
    queryKey: ["/api/bom-templates", selectedTemplate?.id, "items"],
    enabled: !!selectedTemplate?.id,
  });

  const bundleForm = useForm<InsertHardwareBundle>({
    resolver: zodResolver(insertHardwareBundleSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
    },
  });

  type ItemFormValues = Omit<InsertBundleItem, "bundleId">;

  const itemForm = useForm<ItemFormValues>({
    resolver: zodResolver(insertBundleItemSchema.omit({ bundleId: true })),
    defaultValues: {
      itemType: "hinge",
      description: "",
      manufacturer: "",
      model: "",
      quantity: "1",
      location: "",
      notes: "",
    },
  });

  const createBundle = useMutation({
    mutationFn: async (data: InsertHardwareBundle) => {
      const res = await apiRequest("POST", "/api/bundles", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bundles"] });
      toast({
        title: "Success",
        description: "Hardware bundle created successfully. You can now add items to this bundle.",
      });
      setDialogOpen(false);
      bundleForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create bundle",
        description: error.message || "Unable to save bundle. Please verify all fields and try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBundle = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/bundles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bundles"] });
      toast({
        title: "Success",
        description: "Hardware bundle deleted successfully. All associated items have been removed.",
      });
      if (selectedBundle) {
        setViewDetailsOpen(false);
        setSelectedBundle(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete bundle",
        description: error.message || "Unable to remove bundle. It may be in use by existing projects or door openings.",
        variant: "destructive",
      });
    },
  });

  const createBundleItem = useMutation({
    mutationFn: async (data: InsertBundleItem) => {
      if (!selectedBundle?.id) {
        throw new Error("No bundle selected");
      }
      const res = await apiRequest("POST", `/api/bundles/${selectedBundle.id}/items`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bundles", selectedBundle?.id, "items"] });
      toast({
        title: "Success",
        description: "Hardware item added successfully. It's now part of this bundle configuration.",
      });
      setAddItemDialogOpen(false);
      itemForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add item",
        description: error.message || "Unable to add hardware item to bundle. Please verify all fields and try again.",
        variant: "destructive",
      });
    },
  });

  const updateBundleItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertBundleItem> }) => {
      if (!selectedBundle?.id) {
        throw new Error("No bundle selected");
      }
      const res = await apiRequest("PATCH", `/api/bundle-items/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bundles", selectedBundle?.id, "items"] });
      toast({
        title: "Success",
        description: "Hardware item updated successfully. Changes are now reflected in the bundle.",
      });
      setEditingItem(null);
      setAddItemDialogOpen(false);
      itemForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update item",
        description: error.message || "Unable to save item changes. Please verify all fields and try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBundleItem = useMutation({
    mutationFn: async (id: string) => {
      if (!selectedBundle?.id) {
        throw new Error("No bundle selected");
      }
      return await apiRequest("DELETE", `/api/bundle-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bundles", selectedBundle?.id, "items"] });
      toast({
        title: "Success",
        description: "Hardware item removed successfully. It's no longer part of this bundle.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove item",
        description: error.message || "Unable to delete hardware item from bundle. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleViewBundle = (bundle: HardwareBundle) => {
    setSelectedBundle(bundle);
    setViewDetailsOpen(true);
  };

  const handleAddItem = () => {
    itemForm.reset();
    setEditingItem(null);
    setAddItemDialogOpen(true);
  };

  const handleEditItem = (item: BundleItem) => {
    setEditingItem(item);
    itemForm.reset({
      itemType: item.itemType,
      description: item.description || "",
      manufacturer: item.manufacturer || "",
      model: item.model || "",
      quantity: item.quantity,
      location: item.location || "",
      notes: item.notes || "",
    });
    setAddItemDialogOpen(true);
  };

  const onSubmitBundle = (data: InsertHardwareBundle) => {
    createBundle.mutate(data);
  };

  const onSubmitItem = (data: ItemFormValues) => {
    if (editingItem) {
      updateBundleItem.mutate({
        id: editingItem.id,
        data,
      });
    } else {
      createBundleItem.mutate({
        ...data,
        bundleId: selectedBundle!.id,
      });
    }
  };

  // Get unique categories for filtering
  const categories = Array.from(new Set(bundles.map(b => b.category).filter(Boolean))) as string[];

  // Filter bundles based on search and category
  const filteredBundles = bundles.filter(bundle => {
    const matchesSearch = debouncedSearch === "" ||
      bundle.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (bundle.description ?? "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (bundle.category ?? "").toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesCategory = filterCategory === "all" || bundle.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Show error state
  if (isError) {
    return (
      <div className="h-full overflow-auto">
        <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6">
          <ErrorState
            title="Failed to load hardware bundles"
            message={error instanceof Error ? error.message : "Unable to fetch bundle data. Please check your connection and try again."}
            error={error as Error}
            onRetry={refetch}
            testId="error-bundles"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full overflow-auto flex flex-col items-center justify-center py-8 sm:py-12">
        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mb-2 sm:mb-3 text-muted-foreground" />
        <p className="text-sm sm:text-base text-muted-foreground">Loading bundles...</p>
      </div>
    );
  }

  const handleViewTemplate = (template: BomTemplate) => {
    setSelectedTemplate(template);
    setTemplatePreviewOpen(true);
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              <span className="truncate">Hardware Bundles</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Pre-configured hardware packages for faster application
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-bundle" className="w-full sm:w-auto text-xs sm:text-sm shrink-0">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Bundle</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Create Hardware Bundle</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Create a reusable package of hardware components
                </DialogDescription>
              </DialogHeader>
              <Form {...bundleForm}>
                <form onSubmit={bundleForm.handleSubmit(onSubmitBundle)} className="space-y-4">
                  <FormField
                    control={bundleForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bundle Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Standard Office Door Package"
                            data-testid="input-bundle-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bundleForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            value={field.value || ""}
                            placeholder="Describe this hardware bundle..."
                            rows={3}
                            data-testid="input-bundle-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bundleForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., Commercial Office, Healthcare, Education"
                            data-testid="input-bundle-category"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      data-testid="button-cancel-bundle"
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createBundle.isPending}
                      data-testid="button-submit-bundle"
                      className="w-full sm:w-auto"
                    >
                      {createBundle.isPending ? "Creating..." : "Create Bundle"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="bundles" data-testid="tab-my-bundles" className="flex-1 sm:flex-initial text-xs sm:text-sm">
              <Package className="h-4 w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">My Bundles</span>
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-bom-templates" className="flex-1 sm:flex-initial text-xs sm:text-sm">
              <FileText className="h-4 w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">BOM Templates</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bundles" className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
            {/* Search and Filter Controls */}
            {bundles.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Search bundles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9 text-sm"
                  data-testid="input-search-bundles"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchTerm("")}
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {categories.length > 0 && (
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-[180px] text-sm shrink-0" data-testid="select-filter-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {(searchTerm || filterCategory !== "all") && (
              <div className="text-xs sm:text-sm text-muted-foreground">
                Showing {filteredBundles.length} of {bundles.length} bundles
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 sm:py-12 text-sm sm:text-base text-muted-foreground">Loading bundles...</div>
        ) : bundles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
              <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg font-medium text-foreground text-center">No bundles yet</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 text-center">
                Create your first hardware bundle to get started
              </p>
            </CardContent>
          </Card>
        ) : filteredBundles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
              <Search className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-base sm:text-lg font-medium text-foreground text-center">No bundles found</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 text-center">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("all");
                }}
                className="mt-3 sm:mt-4 text-xs sm:text-sm"
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {filteredBundles.map((bundle) => (
              <Card key={bundle.id} className="hover-elevate">
                <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate" data-testid={`text-bundle-name-${bundle.id}`}>
                        {bundle.name}
                      </CardTitle>
                      {bundle.category && (
                        <Badge variant="secondary" className="mt-1.5 sm:mt-2 text-xs shrink-0">
                          {bundle.category}
                        </Badge>
                      )}
                    </div>
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  {bundle.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                      {bundle.description}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewBundle(bundle)}
                      className="flex-1 text-xs sm:text-sm"
                      data-testid={`button-view-bundle-${bundle.id}`}
                    >
                      <Eye className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">View Details</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this bundle?")) {
                          deleteBundle.mutate(bundle.id);
                        }
                      }}
                      data-testid={`button-delete-bundle-${bundle.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{selectedBundle?.name}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">{selectedBundle?.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-semibold">Hardware Items</h3>
                <Button size="sm" onClick={handleAddItem} data-testid="button-add-item" className="text-xs sm:text-sm shrink-0">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Add Item</span>
                </Button>
              </div>
              {bundleItems.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
                  No items in this bundle yet. Add hardware items to create your package.
                </div>
              ) : (
                <div className="space-y-2">
                  {bundleItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                              <Badge className="text-xs shrink-0">{item.itemType}</Badge>
                              <span className="text-xs sm:text-sm font-medium text-foreground">
                                Qty: {item.quantity}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-xs sm:text-sm text-foreground mb-1 truncate">{item.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground">
                              {item.manufacturer && <span className="truncate">Mfr: {item.manufacturer}</span>}
                              {item.model && <span className="truncate">Model: {item.model}</span>}
                              {item.location && <span className="truncate">Location: {item.location}</span>}
                            </div>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground mt-1.5 sm:mt-2 line-clamp-2">{item.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-1 sm:gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditItem(item)}
                              data-testid={`button-edit-item-${item.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm("Remove this item from the bundle?")) {
                                  deleteBundleItem.mutate(item.id);
                                }
                              }}
                              data-testid={`button-delete-item-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{editingItem ? "Edit Item" : "Add Item to Bundle"}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingItem
                  ? "Update the hardware item details"
                  : "Add a hardware component to this bundle"}
              </DialogDescription>
            </DialogHeader>
            <Form {...itemForm}>
              <form onSubmit={itemForm.handleSubmit(onSubmitItem)} className="space-y-4">
                <FormField
                  control={itemForm.control}
                  name="itemType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-item-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {HARDWARE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          placeholder="e.g., Heavy duty continuous hinge"
                          data-testid="input-item-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={itemForm.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Manufacturer</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., Hager"
                            className="text-sm"
                            data-testid="input-item-manufacturer"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={itemForm.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Model</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., BB1279"
                            className="text-sm"
                            data-testid="input-item-model"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={itemForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Quantity</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || "1"}
                            type="number"
                            min="1"
                            onChange={(e) => field.onChange(e.target.value || "1")}
                            className="text-sm"
                            data-testid="input-item-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={itemForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">Location</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., Hinge edge"
                            className="text-sm"
                            data-testid="input-item-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={itemForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Additional notes..."
                          rows={2}
                          data-testid="input-item-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto text-xs sm:text-sm"
                    onClick={() => {
                      setAddItemDialogOpen(false);
                      setEditingItem(null);
                    }}
                    data-testid="button-cancel-item"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full sm:w-auto text-xs sm:text-sm"
                    disabled={createBundleItem.isPending || updateBundleItem.isPending}
                    data-testid="button-submit-item"
                  >
                    {createBundleItem.isPending || updateBundleItem.isPending
                      ? "Saving..."
                      : editingItem
                      ? "Update Item"
                      : "Add Item"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
          </TabsContent>

          <TabsContent value="templates" className="mt-4 sm:mt-6">
            {templatesLoading ? (
              <div className="text-center py-8 sm:py-12">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-2 sm:mb-3 text-muted-foreground" />
                <p className="text-sm sm:text-base text-muted-foreground">Loading templates...</p>
              </div>
            ) : bomTemplates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
                  <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                  <p className="text-base sm:text-lg font-medium text-foreground text-center">No BOM templates available</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 text-center">
                    Pre-configured hardware sets will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {bomTemplates.map((template) => (
                  <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
                    <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg truncate">
                            {template.name}
                          </CardTitle>
                          {template.category && (
                            <Badge variant="outline" className="mt-1.5 sm:mt-2 text-xs shrink-0">
                              {template.category}
                            </Badge>
                          )}
                        </div>
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      {template.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTemplate(template)}
                        className="w-full text-xs sm:text-sm"
                        data-testid={`button-view-template-${template.id}`}
                      >
                        <Eye className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">View Template</span>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Template Preview Dialog */}
        <Dialog open={templatePreviewOpen} onOpenChange={setTemplatePreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{selectedTemplate?.name}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {selectedTemplate?.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 sm:space-y-4">
              {templateItemsLoading ? (
                <div className="text-center py-8 sm:py-12">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-2 sm:mb-3 text-muted-foreground" />
                  <p className="text-xs sm:text-sm text-muted-foreground">Loading template items...</p>
                </div>
              ) : templateItemsError ? (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-xs sm:text-sm text-destructive">Error loading template items</p>
                </div>
              ) : templateItems.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground py-6 sm:py-8 text-center">
                  No items in this template
                </p>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {templateItems.map((item, index) => (
                    <Card key={item.id}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Category:</span>
                            <p className="text-foreground truncate">{item.itemCategory || "—"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Manufacturer:</span>
                            <p className="text-foreground truncate">{item.manufacturer || "—"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Model:</span>
                            <p className="text-foreground truncate">{item.modelNumber || "—"}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Quantity:</span>
                            <p className="text-foreground">{item.quantity || "—"}</p>
                          </div>
                          {item.finish && (
                            <div>
                              <span className="font-medium text-muted-foreground">Finish:</span>
                              <p className="text-foreground truncate">{item.finish}</p>
                            </div>
                          )}
                          {item.handing && (
                            <div>
                              <span className="font-medium text-muted-foreground">Handing:</span>
                              <p className="text-foreground">{item.handing}</p>
                            </div>
                          )}
                          {item.fireRating && (
                            <div>
                              <span className="font-medium text-muted-foreground">Fire Rating:</span>
                              <p className="text-foreground">{item.fireRating}</p>
                            </div>
                          )}
                          {item.sizeSpec && (
                            <div>
                              <span className="font-medium text-muted-foreground">Size:</span>
                              <p className="text-foreground truncate">{item.sizeSpec}</p>
                            </div>
                          )}
                          {item.description && (
                            <div className="col-span-1 sm:col-span-2">
                              <span className="font-medium text-muted-foreground">Description:</span>
                              <p className="text-foreground line-clamp-2">{item.description}</p>
                            </div>
                          )}
                          {item.notes && (
                            <div className="col-span-1 sm:col-span-2">
                              <span className="font-medium text-muted-foreground">Notes:</span>
                              <p className="text-foreground text-xs line-clamp-2">{item.notes}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
