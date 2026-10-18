import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertHardwareCrossReferenceSchema, type HardwareCrossReference, type InsertHardwareCrossReference } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function CrossReferencePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HardwareCrossReference | null>(null);
  const [deletingItem, setDeletingItem] = useState<HardwareCrossReference | null>(null);
  const { toast } = useToast();

  const { 
    data: crossReferences = [], 
    isLoading,
    isError,
    error: errorObj,
    refetch
  } = useQuery<HardwareCrossReference[]>({
    queryKey: ["/api/cross-reference"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertHardwareCrossReference) => {
      const response = await fetch("/api/cross-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create cross-reference");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-reference"] });
      toast({ title: "Cross-reference created successfully" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create cross-reference",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertHardwareCrossReference }) => {
      const response = await fetch(`/api/cross-reference/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update cross-reference");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-reference"] });
      toast({ title: "Cross-reference updated successfully" });
      setIsAddDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update cross-reference",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/cross-reference/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete cross-reference");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cross-reference"] });
      toast({ title: "Cross-reference deleted successfully" });
      setDeletingItem(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete cross-reference",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertHardwareCrossReference>({
    resolver: zodResolver(insertHardwareCrossReferenceSchema),
    defaultValues: {
      productType: "",
      abhPart: "",
      trimcoPart: null,
      rockPart: null,
      otherManufacturerName: null,
      otherManufacturerPart: null,
      notes: null,
    },
  });

  const handleSubmit = (data: InsertHardwareCrossReference) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (!deletingItem) return;
    deleteMutation.mutate(deletingItem.id);
  };

  const handleEdit = (item: HardwareCrossReference) => {
    setEditingItem(item);
    form.reset({
      productType: item.productType,
      abhPart: item.abhPart,
      trimcoPart: item.trimcoPart,
      rockPart: item.rockPart,
      otherManufacturerName: item.otherManufacturerName,
      otherManufacturerPart: item.otherManufacturerPart,
      notes: item.notes,
    });
    setIsAddDialogOpen(true);
  };

  const filteredReferences = searchTerm
    ? crossReferences.filter(item =>
        item.productType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.abhPart.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.trimcoPart && item.trimcoPart.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.rockPart && item.rockPart.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.otherManufacturerPart && item.otherManufacturerPart.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : crossReferences;

  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 max-w-7xl" data-testid="page-cross-reference">
      <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="heading-page-title">
              Hardware Cross-Reference Matrix
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1" data-testid="text-page-description">
              Map equivalent part numbers across manufacturers
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="w-full sm:w-auto text-xs sm:text-sm"
                size="sm"
                data-testid="button-add-cross-reference"
                onClick={() => {
                  setEditingItem(null);
                  form.reset();
                }}
              >
                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                Add Cross-Reference
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle data-testid="heading-dialog-title">
                  {editingItem ? "Edit Cross-Reference" : "Add New Cross-Reference"}
                </DialogTitle>
                <DialogDescription data-testid="text-dialog-description">
                  {editingItem
                    ? "Update the cross-reference information below"
                    : "Enter the equivalent part numbers for this product across manufacturers"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 sm:space-y-4">
                  <FormField
                    control={form.control}
                    name="productType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Push Plate, Hinge, Pull, etc."
                            data-testid="input-product-type"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="abhPart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ABH Part Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="ABH part number"
                            data-testid="input-abh-part"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trimcoPart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trimco Part Number (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Trimco equivalent"
                            data-testid="input-trimco-part"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rockPart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rockwood Part Number (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Rockwood equivalent"
                            data-testid="input-rock-part"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="otherManufacturerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Manufacturer (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="e.g., Ives, Hager, Stanley"
                            data-testid="input-other-manufacturer"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="otherManufacturerPart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Manufacturer Part (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Part number from other manufacturer"
                            data-testid="input-other-part"
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
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="Additional notes or specifications"
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        setEditingItem(null);
                        form.reset();
                      }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" data-testid="button-save">
                      {editingItem ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <CardTitle data-testid="heading-card-title" className="text-base sm:text-lg">
                  Cross-References ({filteredReferences.length})
                </CardTitle>
                <CardDescription data-testid="text-card-description" className="text-xs sm:text-sm">
                  Find equivalent parts across manufacturers
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Search by part number or product type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
            {isError ? (
              <ErrorState 
                error={errorObj as Error} 
                onRetry={refetch}
                message="Unable to load cross-reference data. Please check your connection and try again."
              />
            ) : isLoading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin shrink-0" data-testid="loader-cross-references" />
              </div>
            ) : filteredReferences.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground" data-testid="text-empty">
                {searchTerm ? "No cross-references match your search" : "No cross-references yet. Add one to get started."}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6">
                <div className="min-w-[640px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Product Type</TableHead>
                        <TableHead className="text-xs sm:text-sm">ABH Part</TableHead>
                        <TableHead className="text-xs sm:text-sm">Trimco Part</TableHead>
                        <TableHead className="text-xs sm:text-sm">Rockwood Part</TableHead>
                        <TableHead className="text-xs sm:text-sm">Other Mfg</TableHead>
                        <TableHead className="text-xs sm:text-sm">Other Part</TableHead>
                        <TableHead className="text-xs sm:text-sm">Notes</TableHead>
                        <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReferences.map((item) => (
                        <TableRow key={item.id} data-testid={`row-cross-reference-${item.id}`}>
                          <TableCell className="font-medium text-xs sm:text-sm" data-testid={`text-product-type-${item.id}`}>
                            {item.productType}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm" data-testid={`text-abh-part-${item.id}`}>
                            {item.abhPart}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm" data-testid={`text-trimco-part-${item.id}`}>
                            {item.trimcoPart || "—"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm" data-testid={`text-rock-part-${item.id}`}>
                            {item.rockPart || "—"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm" data-testid={`text-other-mfg-${item.id}`}>
                            {item.otherManufacturerName || "—"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm" data-testid={`text-other-part-${item.id}`}>
                            {item.otherManufacturerPart || "—"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm" data-testid={`text-notes-${item.id}`}>
                            {item.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 sm:gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEdit(item)}
                                aria-label="Edit cross-reference item"
                                data-testid={`button-edit-${item.id}`}
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeletingItem(item)}
                                aria-label="Delete cross-reference item"
                                data-testid={`button-delete-${item.id}`}
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="heading-delete-confirm">
              Delete Cross-Reference
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-confirm">
              Are you sure you want to delete the cross-reference for "{deletingItem?.productType}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
