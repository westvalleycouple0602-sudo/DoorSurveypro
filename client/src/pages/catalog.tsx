import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Plus, 
  Package, 
  Search, 
  Loader2, 
  X, 
  Eye, 
  Edit, 
  Trash2,
  DoorClosed,
  SquareDashedBottomCode,
  Wrench,
  Zap,
  ShieldCheck,
  Tag,
  Building2,
  FileText,
  Hash,
  Boxes
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCatalogItemSchema, type InsertCatalogItem, type CatalogItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Catalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<CatalogItem | null>(null);
  const { toast } = useToast();

  const { data: items = [], isLoading, isError, error, refetch } = useQuery<CatalogItem[]>({
    queryKey: ["/api/catalog"],
  });

  const form = useForm<InsertCatalogItem>({
    resolver: zodResolver(insertCatalogItemSchema),
    defaultValues: {
      category: "door",
      manufacturer: "",
      model: "",
      specifications: "",
      notes: "",
    },
  });

  const editForm = useForm<InsertCatalogItem>({
    resolver: zodResolver(insertCatalogItemSchema),
    defaultValues: {
      category: "door",
      manufacturer: "",
      model: "",
      specifications: "",
      notes: "",
    },
  });

  const createItem = useMutation({
    mutationFn: async (data: InsertCatalogItem) => {
      const res = await apiRequest("POST", "/api/catalog", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      toast({
        title: "Success",
        description: "Catalog item added successfully. It's now available for use in projects.",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add catalog item",
        description: error.message || "Unable to add item. Please verify all required fields are complete.",
        variant: "destructive",
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertCatalogItem }) => {
      const res = await apiRequest("PATCH", `/api/catalog/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      toast({
        title: "Success",
        description: "Catalog item updated successfully. Changes are now reflected across all projects.",
      });
      setEditDialogOpen(false);
      setItemToEdit(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update catalog item",
        description: error.message || "Unable to save changes. This item may be in use by active projects.",
        variant: "destructive",
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/catalog/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog"] });
      toast({
        title: "Success",
        description: "Catalog item deleted successfully. It has been removed from the catalog.",
      });
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete catalog item",
        description: error.message || "This item cannot be deleted because it's in use by existing projects.",
        variant: "destructive",
      });
    },
  });

  const filteredItems = (Array.isArray(items) ? items : []).filter((item) => {
    const query = debouncedSearch.toLowerCase();
    return (
      item.model.toLowerCase().includes(query) ||
      item.manufacturer?.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.specifications?.toLowerCase().includes(query) ||
      item.notes?.toLowerCase().includes(query)
    );
  });

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      door: DoorClosed,
      frame: SquareDashedBottomCode,
      hardware: Wrench,
      automation: Zap,
      "access-control": ShieldCheck,
    };
    return icons[category] || Package;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      door: "bg-chart-1/10 text-chart-1",
      frame: "bg-chart-2/10 text-chart-2",
      hardware: "bg-chart-3/10 text-chart-3",
      automation: "bg-chart-4/10 text-chart-4",
      "access-control": "bg-chart-5/10 text-chart-5",
    };
    return colors[category] || "bg-muted text-muted-foreground";
  };

  const handleEdit = (item: CatalogItem) => {
    setItemToEdit(item);
    editForm.reset({
      category: item.category,
      manufacturer: item.manufacturer || "",
      model: item.model,
      specifications: item.specifications || "",
      notes: item.notes || "",
    });
    setEditDialogOpen(true);
  };

  // Show error state
  if (isError) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to load catalog"
            message={error instanceof Error ? error.message : "Unable to fetch catalog items. Please check your connection and try again."}
            error={error as Error}
            onRetry={refetch}
            testId="error-catalog"
            fullPage
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-foreground shrink-0" />
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Product Catalog</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage your library of doors, frames, hardware, and access control products
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-item" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Catalog Item
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createItem.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Category
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="door">
                              <div className="flex items-center gap-2">
                                <DoorClosed className="h-4 w-4" />
                                Door
                              </div>
                            </SelectItem>
                            <SelectItem value="frame">
                              <div className="flex items-center gap-2">
                                <SquareDashedBottomCode className="h-4 w-4" />
                                Frame
                              </div>
                            </SelectItem>
                            <SelectItem value="hardware">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Hardware
                              </div>
                            </SelectItem>
                            <SelectItem value="automation">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4" />
                                Automation
                              </div>
                            </SelectItem>
                            <SelectItem value="access-control">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" />
                                Access Control
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Manufacturer (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Allegion, ASSA ABLOY" 
                            data-testid="input-manufacturer" 
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Model Number
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., HD-200" data-testid="input-model" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specifications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Specifications (Optional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Technical specifications, dimensions, materials..."
                            className="min-h-20"
                            data-testid="input-specifications"
                            {...field}
                            value={field.value || ""}
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
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Notes (Optional)
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional notes..."
                            className="min-h-20"
                            data-testid="input-notes"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      data-testid="button-cancel"
                      className="w-full sm:w-auto"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createItem.isPending} data-testid="button-submit" className="w-full sm:w-auto">
                      {createItem.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by model, manufacturer, or category..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" data-testid="loading-state">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border p-3 sm:p-6 space-y-2 sm:space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                    <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
                    <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
                  </div>
                  <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded shrink-0" />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Skeleton className="h-3 sm:h-4 w-full" />
                  <Skeleton className="h-3 sm:h-4 w-3/4" />
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 sm:pt-2">
                  <Skeleton className="h-5 sm:h-6 w-16 sm:w-20" />
                  <Skeleton className="h-7 sm:h-8 w-12 sm:w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center" data-testid="empty-state">
                {items.length === 0 ? (
                  <Boxes className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-3 sm:mb-4" />
                ) : (
                  <Package className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-3 sm:mb-4" />
                )}
                <h3 className="text-base sm:text-lg font-medium mb-2">
                  {items.length === 0 ? "No catalog items yet" : "No items found"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-md px-4">
                  {items.length === 0
                    ? "Build your product catalog to streamline door and hardware specifications"
                    : "Try a different search term"}
                </p>
                {items.length === 0 && (
                  <Button size="sm" onClick={() => setDialogOpen(true)} data-testid="button-add-first" className="text-xs sm:text-sm">
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Add First Item
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const CategoryIcon = getCategoryIcon(item.category);
              return (
                <Card 
                  key={item.id} 
                  data-testid={`card-item-${item.id}`}
                  className="hover-elevate active-elevate-2"
                >
                  <CardHeader className="p-3 sm:p-6">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm sm:text-base font-mono truncate min-w-0">{item.model}</CardTitle>
                      <Badge className={`${getCategoryColor(item.category)} shrink-0 text-[10px] sm:text-xs`}>
                        <CategoryIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                        <span className="hidden sm:inline">{item.category}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0 sm:pt-0">
                    {item.manufacturer && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{item.manufacturer}</p>
                      </div>
                    )}
                    {item.specifications && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-3">
                        {item.specifications}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 sm:gap-2 pt-1 sm:pt-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedItem(item)}
                            data-testid={`button-view-${item.id}`}
                            className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View details</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(item)}
                            data-testid={`button-edit-${item.id}`}
                            className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit item</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteItem.mutate(item.id)}
                            disabled={deleteItem.isPending}
                            data-testid={`button-delete-${item.id}`}
                            className="text-xs h-7 sm:h-8 px-2 sm:px-3"
                          >
                            {deleteItem.isPending ? (
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete item</TooltipContent>
                      </Tooltip>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <Eye className="h-5 w-5" />
              {selectedItem?.model}
            </DialogTitle>
            <DialogDescription>
              View complete product specifications and details
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const CategoryIcon = getCategoryIcon(selectedItem.category);
                  return (
                    <Badge className={getCategoryColor(selectedItem.category)}>
                      <CategoryIcon className="h-3 w-3 mr-1" />
                      {selectedItem.category}
                    </Badge>
                  );
                })()}
              </div>
              
              {selectedItem.manufacturer && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Manufacturer
                  </h3>
                  <p className="text-sm text-foreground">{selectedItem.manufacturer}</p>
                </div>
              )}

              {selectedItem.specifications && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Specifications
                  </h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedItem.specifications}</p>
                </div>
              )}

              {selectedItem.notes && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notes
                  </h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedItem.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedItem(null)}
                  data-testid="button-close-detail"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Catalog Item
            </DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => itemToEdit && updateItem.mutate({ id: itemToEdit.id, data }))} className="space-y-4">
              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Category
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="door">
                          <div className="flex items-center gap-2">
                            <DoorClosed className="h-4 w-4" />
                            Door
                          </div>
                        </SelectItem>
                        <SelectItem value="frame">
                          <div className="flex items-center gap-2">
                            <SquareDashedBottomCode className="h-4 w-4" />
                            Frame
                          </div>
                        </SelectItem>
                        <SelectItem value="hardware">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4" />
                            Hardware
                          </div>
                        </SelectItem>
                        <SelectItem value="automation">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Automation
                          </div>
                        </SelectItem>
                        <SelectItem value="access-control">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Access Control
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Manufacturer (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Allegion, ASSA ABLOY" 
                        data-testid="input-edit-manufacturer" 
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Model Number
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., HD-200" data-testid="input-edit-model" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="specifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Specifications (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Technical specifications, dimensions, materials..."
                        className="min-h-20"
                        data-testid="input-edit-specifications"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes (Optional)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes..."
                        className="min-h-20"
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
                    setEditDialogOpen(false);
                    setItemToEdit(null);
                  }}
                  data-testid="button-edit-cancel"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={updateItem.isPending} data-testid="button-edit-submit">
                  {updateItem.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Item
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
