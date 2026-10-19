import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { GasketingCatalog, InsertGasketingCatalog } from "@shared/schema";
import { insertGasketingCatalogSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { Plus, Edit, Trash2, Package, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDebounce } from "@/hooks/use-debounce";

const formSchema = insertGasketingCatalogSchema.extend({
  manufacturer: z.string().min(1, "Manufacturer is required"),
  partNumber: z.string().min(1, "Part number is required"),
  productName: z.string().min(1, "Product name is required"),
  category: z.enum([
    "perimeter-seal",
    "threshold-seal",
    "meeting-stile-seal",
    "astragal",
    "smoke-seal",
    "sound-seal",
    "weather-seal",
    "door-bottom"
  ]),
});

type FormData = z.infer<typeof formSchema>;

const categoryLabels: Record<string, string> = {
  "perimeter-seal": "Perimeter Seal",
  "threshold-seal": "Threshold Seal",
  "meeting-stile-seal": "Meeting Stile Seal",
  "astragal": "Astragal",
  "smoke-seal": "Smoke Seal",
  "sound-seal": "Sound Seal",
  "weather-seal": "Weather Seal",
  "door-bottom": "Door Bottom"
};

export default function GasketingCatalogPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GasketingCatalog | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { toast } = useToast();

  const { 
    data: gasketingItems = [], 
    isLoading,
    isError,
    error: errorObj,
    refetch
  } = useQuery<GasketingCatalog[]>({
    queryKey: ["/api/gasketing-catalog"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      manufacturer: "",
      partNumber: "",
      productName: "",
      category: "perimeter-seal",
      description: "",
      material: "",
      fireRating: "",
      smokeRating: "",
      soundRating: "",
      application: "",
      doorType: "",
      dimensions: "",
      finish: "",
      listPrice: 0,
      notes: "",
      isActive: "yes",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertGasketingCatalog) =>
      apiRequest("POST", "/api/gasketing-catalog", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gasketing-catalog"] });
      toast({ title: "Gasketing item created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create gasketing item", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertGasketingCatalog> }) =>
      apiRequest("PATCH", `/api/gasketing-catalog/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gasketing-catalog"] });
      toast({ title: "Gasketing item updated successfully" });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update gasketing item", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/gasketing-catalog/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gasketing-catalog"] });
      toast({ title: "Gasketing item deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete gasketing item", variant: "destructive" });
    },
  });

  const handleSubmit = (data: FormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (item: GasketingCatalog) => {
    setEditingItem(item);
    form.reset({
      manufacturer: item.manufacturer,
      partNumber: item.partNumber,
      productName: item.productName,
      category: item.category as any,
      description: item.description || "",
      material: item.material || "",
      fireRating: item.fireRating || "",
      smokeRating: item.smokeRating || "",
      soundRating: item.soundRating || "",
      application: item.application || "",
      doorType: item.doorType || "",
      dimensions: item.dimensions || "",
      finish: item.finish || "",
      listPrice: item.listPrice || 0,
      notes: item.notes || "",
      isActive: item.isActive || "yes",
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    form.reset({
      manufacturer: "",
      partNumber: "",
      productName: "",
      category: "perimeter-seal",
      description: "",
      material: "",
      fireRating: "",
      smokeRating: "",
      soundRating: "",
      application: "",
      doorType: "",
      dimensions: "",
      finish: "",
      listPrice: 0,
      notes: "",
      isActive: "yes",
    });
    setIsDialogOpen(true);
  };

  // Filter items based on search and category
  const filteredItems = gasketingItems.filter(item => {
    const matchesSearch = debouncedSearch === "" ||
      item.manufacturer.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.productName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (item.material ?? "").toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 max-w-7xl space-y-4 sm:space-y-6" data-testid="page-gasketing-catalog">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Gasketing Catalog</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage gasketing products for door and frame assemblies
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} data-testid="button-add-gasketing" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Gasketing Product" : "Add New Gasketing Product"}
              </DialogTitle>
              <DialogDescription>
                Add gasketing, seals, astragals, and weatherstripping products to the catalog
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Pemko, NGP, Zero" data-testid="input-manufacturer" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="partNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Part Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 303AV, 346C" data-testid="input-part-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Automatic Door Bottom" data-testid="input-product-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          rows={3}
                          placeholder="Product description..."
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="fireRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fire Rating</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., 20-min, 90-min" data-testid="input-fire-rating" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smokeRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Smoke Rating</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., UL 1784" data-testid="input-smoke-rating" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="soundRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sound Rating</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., STC-30" data-testid="input-sound-rating" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., Silicone, Neoprene" data-testid="input-material" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="finish"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Finish</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., Black, Mill, Bronze" data-testid="input-finish" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dimensions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dimensions</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder='e.g., 1-1/2" x 84"' data-testid="input-dimensions" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="application"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Application</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., frame-mount, door-mount" data-testid="input-application" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="doorType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Door Type</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="e.g., wood, metal, glass, all" data-testid="input-door-type" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="listPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>List Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                            data-testid="input-list-price"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Additional notes..." data-testid="input-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingItem(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-gasketing"
                  >
                    {editingItem ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1 sm:max-w-sm min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
            data-testid="input-search-gasketing"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchTerm("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              aria-label="Clear search"
              data-testid="button-clear-search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-64" data-testid="select-filter-category">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {(searchTerm || filterCategory !== "all") && (
        <div className="flex items-center gap-2 mb-3 sm:mb-4 text-xs sm:text-sm text-muted-foreground">
          <span data-testid="text-results-count">
            Showing {filteredItems.length} of {gasketingItems.length} products
          </span>
        </div>
      )}

      {isError ? (
        <ErrorState 
          error={errorObj as Error} 
          onRetry={refetch}
          message="Unable to load gasketing catalog. Please check your connection and try again."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin shrink-0" data-testid="loader-gasketing" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card data-testid="card-empty-state">
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
            <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4 shrink-0" />
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-center">
              {searchTerm || filterCategory !== "all" ? "No Matching Products" : "No Gasketing Products"}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center mb-3 sm:mb-4">
              {searchTerm || filterCategory !== "all"
                ? "No products match your search or filter criteria"
                : "Add gasketing products to build your catalog"}
            </p>
            {searchTerm || filterCategory !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setFilterCategory("all");
                }}
                data-testid="button-clear-filters"
                className="text-xs sm:text-sm"
              >
                Clear Filters
              </Button>
            ) : (
              <Button onClick={handleAddNew} data-testid="button-add-first-gasketing" size="sm" className="text-xs sm:text-sm">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                Add Product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" data-testid="list-gasketing">
          {filteredItems.map((item) => (
            <Card key={item.id} data-testid={`card-gasketing-${item.id}`}>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2 flex-wrap">
                      <span className="truncate">{item.manufacturer}</span>
                      {item.isActive !== "yes" && (
                        <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs truncate">
                      {item.partNumber}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(item)}
                      aria-label="Edit product"
                      data-testid={`button-edit-${item.id}`}
                    >
                      <Edit className="h-3 w-3 shrink-0" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Delete product"
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-3 w-3 shrink-0" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{item.manufacturer} {item.partNumber}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(item.id)}
                            data-testid="button-confirm-delete"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <Badge variant="secondary" className="w-fit mt-2 shrink-0 text-xs">
                  {categoryLabels[item.category]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
                
                <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs">
                  {item.fireRating && (
                    <div>
                      <span className="text-muted-foreground">Fire:</span> {item.fireRating}
                    </div>
                  )}
                  {item.smokeRating && (
                    <div>
                      <span className="text-muted-foreground">Smoke:</span> {item.smokeRating}
                    </div>
                  )}
                  {item.soundRating && (
                    <div>
                      <span className="text-muted-foreground">Sound:</span> {item.soundRating}
                    </div>
                  )}
                  {item.material && (
                    <div>
                      <span className="text-muted-foreground">Material:</span> {item.material}
                    </div>
                  )}
                </div>

                {item.listPrice && item.listPrice > 0 && (
                  <div className="text-xs sm:text-sm font-semibold">
                    ${item.listPrice.toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
