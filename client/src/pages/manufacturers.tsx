import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Package, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  FileText, 
  Loader2, 
  X, 
  Search, 
  Factory, 
  Eye, 
  Star,
  Percent 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertManufacturerContactSchema, type InsertManufacturerContact, type ManufacturerContact, type ManufacturerProduct } from "@shared/schema";
import { formatDiscountForDisplay } from "@shared/discountUtils";
import { ManufacturerLiteratureDialog } from "@/components/manufacturer-literature";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";

export default function ManufacturersPage() {
  const { toast } = useToast();
  const [editingContact, setEditingContact] = useState<ManufacturerContact | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingProducts, setViewingProducts] = useState<string | null>(null);
  const [viewingLiterature, setViewingLiterature] = useState<{ id: string; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce search for better performance
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Use server-side search with debounced value
  const { data: contacts, isLoading, isError, error, refetch } = useQuery<ManufacturerContact[]>({
    queryKey: ["/api/manufacturers", debouncedSearch],
    queryFn: async () => {
      const searchParams = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
      const response = await fetch(`/api/manufacturers${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch manufacturers');
      return response.json();
    },
  });

  // Ensure contacts is always an array
  const contactsList = Array.isArray(contacts) ? contacts : [];

  const { 
    data: products, 
    isLoading: productsLoading,
    isError: productsError,
    error: productsErrorObj,
    refetch: refetchProducts
  } = useQuery<ManufacturerProduct[]>({
    queryKey: ["/api/manufacturers", viewingProducts, "products"],
    enabled: !!viewingProducts,
  });

  const form = useForm<InsertManufacturerContact>({
    resolver: zodResolver(insertManufacturerContactSchema),
    defaultValues: {
      manufacturerName: "",
      contactName: "",
      email: "",
      role: "",
      phone: "",
      regions: [],
      notes: "",
      isPrimary: "no",
      discountMultiplier: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertManufacturerContact) => {
      const response = await fetch("/api/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create contact");
      }
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate all manufacturers queries (with any search term)
      await queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"], exact: false });
      await queryClient.refetchQueries({ queryKey: ["/api/manufacturers"], exact: false });
      toast({ 
        title: "Success", 
        description: "Manufacturer contact created successfully" 
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to create manufacturer contact",
        description: errorMessage.includes("duplicate") 
          ? "A contact with this email already exists" 
          : errorMessage || "Please check the form and try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertManufacturerContact> }) => {
      const response = await fetch(`/api/manufacturers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update contact");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"], exact: false });
      await queryClient.refetchQueries({ queryKey: ["/api/manufacturers"], exact: false });
      toast({ 
        title: "Success", 
        description: "Manufacturer contact updated successfully" 
      });
      setIsDialogOpen(false);
      setEditingContact(null);
      form.reset();
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to update manufacturer contact",
        description: errorMessage.includes("duplicate") 
          ? "A contact with this email already exists" 
          : errorMessage || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/manufacturers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete contact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
      toast({ 
        title: "Success", 
        description: "Manufacturer contact deleted successfully" 
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to delete manufacturer contact",
        description: errorMessage.includes("foreign key") || errorMessage.includes("in use")
          ? "This contact is being used by products or purchase orders and cannot be deleted" 
          : errorMessage || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (contact?: ManufacturerContact) => {
    if (contact) {
      setEditingContact(contact);
      form.reset({
        manufacturerName: contact.manufacturerName,
        contactName: contact.contactName,
        email: contact.email,
        role: contact.role || "",
        phone: contact.phone || "",
        regions: contact.regions || [],
        notes: contact.notes || "",
        isPrimary: contact.isPrimary || "no",
        discountMultiplier: contact.discountMultiplier || "",
      });
    } else {
      setEditingContact(null);
      form.reset({
        manufacturerName: "",
        contactName: "",
        email: "",
        role: "",
        phone: "",
        regions: [],
        notes: "",
        discountMultiplier: "",
        isPrimary: "no",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: InsertManufacturerContact) => {
    // Convert empty strings to null for optional fields
    const cleanedData = {
      ...data,
      discountMultiplier: data.discountMultiplier?.trim() || null,
      phone: data.phone?.trim() || null,
      role: data.role?.trim() || null,
      notes: data.notes?.trim() || null,
    };
    
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this manufacturer contact?")) {
      deleteMutation.mutate(id);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
          <Skeleton className="h-8 sm:h-10 w-48 sm:w-64" />
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground shrink-0" data-testid="loading-manufacturers" />
            <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-muted-foreground" role="status" aria-live="polite">Loading manufacturers...</p>
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 sm:h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to load manufacturers"
            message={error instanceof Error ? error.message : "Unable to fetch manufacturer contacts. Please check your connection and try again."}
            error={error as Error}
            onRetry={refetch}
            testId="error-manufacturers"
            fullPage
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-manufacturers">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              <span>Manufacturer Contacts</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage manufacturer contacts for door, frame, and hardware quotes
            </p>
          </div>
          <Button size="sm" className="w-full sm:w-auto text-xs sm:text-sm" data-testid="button-add-manufacturer" onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4 shrink-0" />
            Add Contact
          </Button>
        </div>

        {contactsList.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              data-testid="input-search"
              placeholder="Search manufacturers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs sm:text-sm"
            />
          </div>
        )}

        {contactsList.length === 0 ? (
          <EmptyState
            icon={Factory}
            title="No manufacturer contacts yet"
            description="Add your first manufacturer contact to begin requesting quotes, managing product catalogs, and tracking vendor relationships."
            actionLabel="Add First Contact"
            onAction={() => handleOpenDialog()}
            secondaryAction={{
              label: "Learn More",
              href: "/reference",
            }}
            testId="empty-manufacturers"
          />
        ) : contactsList.length > 0 && contactsList.length === contacts?.length && searchTerm ? (
          <EmptyState
            icon={Search}
            title="No manufacturers found"
            description={`No manufacturer contacts match "${searchTerm}". Try adjusting your search terms or add a new contact.`}
            actionLabel="Clear Search"
            onAction={() => setSearchTerm("")}
            secondaryAction={{
              label: "Add New Contact",
              onClick: () => handleOpenDialog(),
            }}
            testId="empty-search-manufacturers"
          />
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {contactsList.map((contact: ManufacturerContact) => (
              <Card key={contact.id} data-testid={`card-manufacturer-${contact.id}`}>
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <div className="flex justify-between items-start gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">{contact.manufacturerName}</span>
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2 text-xs sm:text-sm">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{contact.contactName}</span>
                      </CardDescription>
                      <CardDescription className="mt-1 flex items-center gap-2 text-xs sm:text-sm">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-edit-${contact.id}`}
                            onClick={() => handleOpenDialog(contact)}
                            aria-label="Edit contact"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit contact</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-delete-${contact.id}`}
                            onClick={() => handleDelete(contact.id)}
                            disabled={deleteMutation.isPending}
                            aria-label="Delete contact"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete contact</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-2 sm:space-y-3">
                  {contact.role && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <User className="h-3 w-3 shrink-0" />
                        Role
                      </p>
                      <p className="text-xs sm:text-sm ml-5">{contact.role}</p>
                    </div>
                  )}
                  {contact.phone && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3 shrink-0" />
                        Phone
                      </p>
                      <p className="text-xs sm:text-sm ml-5">{contact.phone}</p>
                    </div>
                  )}
                  {contact.regions && contact.regions.length > 0 && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-3 w-3 shrink-0" />
                        Regions
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1 ml-5">
                        {contact.regions.map((region, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs shrink-0">
                            {region}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {contact.notes && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <FileText className="h-3 w-3 shrink-0" />
                        Notes
                      </p>
                      <p className="text-xs sm:text-sm line-clamp-2 ml-5">{contact.notes}</p>
                    </div>
                  )}
                  {contact.discountMultiplier && typeof contact.discountMultiplier === 'string' && contact.discountMultiplier.trim() !== "" && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Percent className="h-3 w-3 shrink-0" />
                        Discount
                      </p>
                      <p className="text-xs sm:text-sm ml-5" data-testid={`text-discount-${contact.id}`}>
                        {formatDiscountForDisplay(contact.discountMultiplier)}
                      </p>
                    </div>
                  )}
                  {contact.isPrimary === "yes" && (
                    <Badge variant="default" className="text-xs shrink-0">
                      <Star className="h-3 w-3 mr-1 shrink-0" />
                      Primary Contact
                    </Badge>
                  )}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs sm:text-sm"
                      data-testid={`button-view-products-${contact.id}`}
                      onClick={() => setViewingProducts(contact.id)}
                    >
                      <Eye className="mr-2 h-4 w-4 shrink-0" />
                      View Products
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs sm:text-sm"
                      data-testid={`button-view-literature-${contact.id}`}
                      onClick={() => setViewingLiterature({ id: contact.id, name: contact.manufacturerName })}
                    >
                      <FileText className="mr-2 h-4 w-4 shrink-0" />
                      View Literature
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                {editingContact ? (
                  <>
                    <Pencil className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span>Edit Manufacturer Contact</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span>Add Manufacturer Contact</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingContact
                  ? "Update manufacturer contact information"
                  : "Add a new manufacturer contact for quote requests"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 sm:space-y-4">
                <FormField
                  control={form.control}
                  name="manufacturerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-xs sm:text-sm">
                        <Building2 className="h-4 w-4 shrink-0" />
                        Manufacturer Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-manufacturer-name"
                          placeholder="ABC Door Company"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-xs sm:text-sm">
                        <User className="h-4 w-4 shrink-0" />
                        Contact Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          data-testid="input-contact-name"
                          placeholder="John Smith"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-xs sm:text-sm">
                        <Mail className="h-4 w-4 shrink-0" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          data-testid="input-manufacturer-email"
                          placeholder="quotes@abcdoor.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-xs sm:text-sm">
                        <User className="h-4 w-4 shrink-0" />
                        Role (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          data-testid="input-role"
                          placeholder="Sales, Technical, Support"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-xs sm:text-sm">
                        <Phone className="h-4 w-4 shrink-0" />
                        Phone (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          data-testid="input-manufacturer-phone"
                          placeholder="(555) 123-4567"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discountMultiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-xs sm:text-sm">
                        <Percent className="h-4 w-4 shrink-0" />
                        Discount Multiplier (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ""}
                          data-testid="input-discount-multiplier"
                          placeholder="e.g., 0.5, 50, or 50/10/5"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Decimal (0-1), percentage (0-100), or stacked (e.g., 50/10/5 = 57.25% total)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-xs sm:text-sm">
                        <FileText className="h-4 w-4 shrink-0" />
                        Notes (Optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          data-testid="input-manufacturer-notes"
                          placeholder="Additional information..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 sm:pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    <X className="mr-2 h-4 w-4 shrink-0" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    data-testid="button-submit-manufacturer"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
                        {editingContact ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        {editingContact ? (
                          <>
                            <Pencil className="mr-2 h-4 w-4 shrink-0" />
                            Update
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4 shrink-0" />
                            Create
                          </>
                        )}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingProducts} onOpenChange={() => setViewingProducts(null)}>
          <DialogContent className="p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span>Manufacturer Products</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Products associated with this manufacturer
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {productsLoading ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground shrink-0" />
                  <p className="ml-2 sm:ml-3 text-xs sm:text-sm text-muted-foreground">Loading products...</p>
                </div>
              ) : productsError ? (
                <ErrorState
                  title="Failed to load products"
                  message={productsErrorObj instanceof Error ? productsErrorObj.message : "Unable to fetch manufacturer products"}
                  error={productsErrorObj as Error}
                  onRetry={refetchProducts}
                  testId="error-manufacturer-products"
                />
              ) : !products || products.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground shrink-0" />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    No products associated with this manufacturer yet.
                  </p>
                </div>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg border min-w-0"
                    data-testid={`product-item-${product.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium flex items-center gap-2">
                        <Package className="h-4 w-4 shrink-0" />
                        <span className="truncate">{product.productType}</span>
                      </p>
                      {product.catalogItemId && (
                        <p className="text-xs sm:text-sm text-muted-foreground ml-6 truncate">{product.catalogItemId}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {viewingLiterature && (
          <ManufacturerLiteratureDialog
            contactId={viewingLiterature.id}
            manufacturerName={viewingLiterature.name}
            open={!!viewingLiterature}
            onOpenChange={(open) => !open && setViewingLiterature(null)}
          />
        )}
      </div>
    </div>
  );
}
