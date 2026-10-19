import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, Package, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertAdditionalDoorItemSchema, type AdditionalDoorItem, type InsertAdditionalDoorItem, type AdditionalItemCategory } from "@shared/schema";

interface AdditionalItemsManagerProps {
  openingId: string;
  organizationId: string;
}

const categoryLabels: Record<string, string> = {
  decorative: "Decorative",
  security: "Security",
  access_control: "Access Control",
  protection: "Protection",
  custom: "Custom",
};

export function AdditionalItemsManager({ openingId, organizationId }: AdditionalItemsManagerProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdditionalDoorItem | null>(null);

  // React Hook Form with Zod validation
  const form = useForm<InsertAdditionalDoorItem>({
    resolver: zodResolver(insertAdditionalDoorItemSchema),
    defaultValues: {
      organizationId,
      openingId,
      category: "decorative",
      customCategory: null,
      name: "",
      description: null,
      quantity: 1,
      unitCost: 0,
      sku: null,
      manufacturer: null,
      supplierName: null,
      modelNumber: null,
      installNotes: null,
      notes: null,
    },
  });

  // Fetch additional items
  const { data: items = [], isLoading } = useQuery<AdditionalDoorItem[]>({
    queryKey: [`/api/openings/${openingId}/additional-items`],
    enabled: !!openingId,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: InsertAdditionalDoorItem) => {
      if (editingItem) {
        const { organizationId: _, openingId: __, ...updatePayload } = data;
        return await apiRequest("PATCH", `/api/additional-items/${editingItem.id}`, updatePayload);
      } else {
        return await apiRequest("POST", `/api/openings/${openingId}/additional-items`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${openingId}/additional-items`] });
      toast({
        title: editingItem ? "Item updated" : "Item added",
        description: `Additional item has been ${editingItem ? "updated" : "added"} successfully.`,
      });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingItem ? "update" : "add"} item`,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/additional-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/openings/${openingId}/additional-items`] });
      toast({
        title: "Item deleted",
        description: "Additional item has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (item?: AdditionalDoorItem) => {
    if (item) {
      setEditingItem(item);
      form.reset({
        organizationId,
        openingId,
        category: item.category as AdditionalItemCategory,
        customCategory: item.customCategory,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitCost ?? 0,
        sku: item.sku,
        manufacturer: item.manufacturer,
        supplierName: item.supplierName,
        modelNumber: item.modelNumber,
        installNotes: item.installNotes,
        notes: item.notes,
      });
    } else {
      setEditingItem(null);
      form.reset({
        organizationId,
        openingId,
        category: "decorative" as AdditionalItemCategory,
        customCategory: null,
        name: "",
        description: null,
        quantity: 1,
        unitCost: 0,
        sku: null,
        manufacturer: null,
        supplierName: null,
        modelNumber: null,
        installNotes: null,
        notes: null,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    form.reset();
  };

  const onSubmit = (data: InsertAdditionalDoorItem) => {
    saveMutation.mutate(data);
  };

  const totalCost = items.reduce((sum, item) => sum + (item.quantity * (item.unitCost ?? 0)), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Additional Door Items
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenDialog()}
              data-testid="button-add-additional-item"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Additional Item" : "Add Additional Item"}</DialogTitle>
              <DialogDescription>
                Add non-hardware items like clavos, vinyl wraps, card readers, security film, etc.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-item-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("category") === "custom" && (
                    <FormField
                      control={form.control}
                      name="customCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Category</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              placeholder="e.g., Weatherproofing"
                              data-testid="input-custom-category"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Decorative Clavo Set"
                            data-testid="input-item-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              field.onChange(isNaN(val) ? 1 : val);
                            }}
                            data-testid="input-item-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Cost ($) *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              field.onChange(isNaN(val) ? 0 : val);
                            }}
                            data-testid="input-item-cost"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., CLV-100"
                            data-testid="input-item-sku"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., Rocky Mountain Hardware"
                            data-testid="input-item-manufacturer"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplierName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., ABC Supply Co"
                            data-testid="input-item-supplier"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="modelNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., CL-2000"
                            data-testid="input-item-model"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Describe the item..."
                          rows={2}
                          data-testid="input-item-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="installNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Installation Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Special installation instructions..."
                          rows={2}
                          data-testid="input-item-install-notes"
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
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Any other notes..."
                          rows={2}
                          data-testid="input-item-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    data-testid="button-cancel-additional-item"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    data-testid="button-save-additional-item"
                  >
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingItem ? "Updating..." : "Adding..."}
                      </>
                    ) : (
                      <>{editingItem ? "Update Item" : "Add Item"}</>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No additional items yet</p>
            <p className="text-xs mt-1">Add items like clavos, vinyl wraps, or security film</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3 rounded-lg border bg-card hover-elevate"
                  data-testid={`item-card-${item.id}`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium" data-testid={`item-name-${item.id}`}>
                        {item.name}
                      </h4>
                      <Badge variant="secondary" data-testid={`item-category-${item.id}`}>
                        {item.category === "custom" && item.customCategory
                          ? item.customCategory
                          : categoryLabels[item.category]}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {item.manufacturer && (
                        <span data-testid={`item-manufacturer-${item.id}`}>
                          Mfr: {item.manufacturer}
                        </span>
                      )}
                      {item.modelNumber && (
                        <span data-testid={`item-model-${item.id}`}>
                          Model: {item.modelNumber}
                        </span>
                      )}
                      {item.sku && (
                        <span data-testid={`item-sku-${item.id}`}>SKU: {item.sku}</span>
                      )}
                      {item.supplierName && (
                        <span data-testid={`item-supplier-${item.id}`}>
                          Supplier: {item.supplierName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span data-testid={`item-quantity-${item.id}`}>
                        Qty: <strong>{item.quantity}</strong>
                      </span>
                      <span data-testid={`item-unit-cost-${item.id}`}>
                        Unit: <strong>${(item.unitCost ?? 0).toFixed(2)}</strong>
                      </span>
                      <span
                        className="text-primary font-medium"
                        data-testid={`item-total-${item.id}`}
                      >
                        Total: ${(item.quantity * (item.unitCost ?? 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(item)}
                      aria-label="Edit item"
                      data-testid={`button-edit-item-${item.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this item?")) {
                          deleteItem.mutate(item.id);
                        }
                      }}
                      aria-label="Delete item"
                      data-testid={`button-delete-item-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {items.length > 0 && (
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
                <div className="text-lg font-semibold" data-testid="total-additional-cost">
                  Total: ${totalCost.toFixed(2)}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
