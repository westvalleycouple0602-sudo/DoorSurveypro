import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Package, 
  Truck, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  FileText, 
  Loader2, 
  Search, 
  DollarSign, 
  Star,
  Percent,
  Building2,
  Globe,
  Calculator,
  AlertCircle
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
  FormDescription,
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
import { insertDistributorSchema, type InsertDistributor, type Distributor } from "@shared/schema";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { Separator } from "@/components/ui/separator";

export default function DistributorsPage() {
  const { toast } = useToast();
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce search for better performance
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Fetch distributors
  const { data: distributors, isLoading, isError, error, refetch } = useQuery<Distributor[]>({
    queryKey: ["/api/distributors"],
  });

  // Ensure distributors is always an array
  const distributorsList = Array.isArray(distributors) ? distributors : [];

  // Client-side filtering
  const filteredDistributors = distributorsList.filter((dist) => {
    if (!debouncedSearch) return true;
    const search = debouncedSearch.toLowerCase();
    return (
      dist.name.toLowerCase().includes(search) ||
      dist.contactName?.toLowerCase().includes(search) ||
      dist.email?.toLowerCase().includes(search) ||
      dist.vendorType?.toLowerCase().includes(search)
    );
  });

  const form = useForm<InsertDistributor>({
    resolver: zodResolver(insertDistributorSchema),
    defaultValues: {
      name: "",
      vendorType: "distributor",
      contactName: "",
      email: "",
      phone: "",
      website: "",
      accountNumber: "",
      regions: [],
      notes: "",
      discountMultiplier: "",
      markupPercent: null,
      flatFee: null,
      shippingFeeType: "flat",
      shippingFeeAmount: null,
      handlingFee: null,
      minimumOrderAmount: null,
      paymentTerms: "",
      isPrimary: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertDistributor) => {
      const response = await apiRequest("POST", "/api/distributors", data);
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/distributors"] });
      toast({ 
        title: "Success", 
        description: "Distributor created successfully" 
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create distributor",
        description: error.message || "Please check the form and try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertDistributor> }) => {
      const response = await apiRequest("PUT", `/api/distributors/${id}`, data);
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/distributors"] });
      toast({ 
        title: "Success", 
        description: "Distributor updated successfully" 
      });
      setIsDialogOpen(false);
      setEditingDistributor(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update distributor",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/distributors/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete distributor");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/distributors"] });
      toast({ 
        title: "Success", 
        description: "Distributor deleted successfully" 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete distributor",
        description: error.message?.includes("referenced by hardware") 
          ? "This distributor is being used by hardware items and cannot be deleted. Please reassign the hardware items first." 
          : error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PUT", `/api/distributors/${id}/set-primary`, {});
      return await response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/distributors"] });
      toast({ 
        title: "Success", 
        description: "Primary distributor updated" 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to set primary distributor",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (distributor?: Distributor) => {
    if (distributor) {
      setEditingDistributor(distributor);
      form.reset({
        name: distributor.name,
        vendorType: distributor.vendorType || "distributor",
        contactName: distributor.contactName || "",
        email: distributor.email || "",
        phone: distributor.phone || "",
        website: distributor.website || "",
        accountNumber: distributor.accountNumber || "",
        regions: distributor.regions || [],
        notes: distributor.notes || "",
        discountMultiplier: distributor.discountMultiplier || "",
        markupPercent: distributor.markupPercent,
        flatFee: distributor.flatFee,
        shippingFeeType: distributor.shippingFeeType || "flat",
        shippingFeeAmount: distributor.shippingFeeAmount,
        handlingFee: distributor.handlingFee,
        minimumOrderAmount: distributor.minimumOrderAmount,
        paymentTerms: distributor.paymentTerms || "",
        isPrimary: distributor.isPrimary || false,
      });
    } else {
      setEditingDistributor(null);
      form.reset();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: InsertDistributor) => {
    // Convert empty strings to undefined for optional fields
    const cleanedData: Partial<InsertDistributor> = {
      ...data,
      contactName: data.contactName?.trim() || undefined,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      website: data.website?.trim() || undefined,
      accountNumber: data.accountNumber?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
      discountMultiplier: data.discountMultiplier?.trim() || undefined,
      paymentTerms: data.paymentTerms?.trim() || undefined,
    };
    
    if (editingDistributor) {
      updateMutation.mutate({ id: editingDistributor.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData as InsertDistributor);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSetPrimary = (id: string, name: string) => {
    if (confirm(`Set ${name} as your primary distributor?`)) {
      setPrimaryMutation.mutate(id);
    }
  };

  // Format pricing for display
  const formatPrice = (value: number | null | undefined) => {
    if (value === null || value === undefined) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return null;
    return `${value}%`;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
          <Skeleton className="h-10 sm:h-12 w-48 sm:w-64" />
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" data-testid="loading-distributors" />
            <p className="ml-2 sm:ml-3 text-sm sm:text-base text-muted-foreground" role="status" aria-live="polite">Loading distributors...</p>
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 sm:h-64" />
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
            title="Failed to load distributors"
            message={error instanceof Error ? error.message : "Unable to fetch distributors. Please check your connection and try again."}
            error={error as Error}
            onRetry={refetch}
            testId="error-distributors"
            fullPage
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-distributors">
              <Truck className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              <span className="truncate">Distributors & Vendors</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage vendor relationships, pricing, and procurement sources
            </p>
          </div>
          <Button size="sm" className="w-full sm:w-auto text-xs sm:text-sm shrink-0" data-testid="button-add-distributor" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Distributor</span>
          </Button>
        </div>

        {distributorsList.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              data-testid="input-search"
              placeholder="Search distributors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        )}

        {distributorsList.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No distributors yet"
            description="Add your first distributor to manage procurement sources, pricing, and vendor relationships for hardware items."
            actionLabel="Add First Distributor"
            onAction={() => handleOpenDialog()}
            testId="empty-distributors"
          />
        ) : filteredDistributors.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No distributors found"
            description={`No distributors match "${searchTerm}". Try adjusting your search terms or add a new distributor.`}
            actionLabel="Clear Search"
            onAction={() => setSearchTerm("")}
            secondaryAction={{
              label: "Add New Distributor",
              onClick: () => handleOpenDialog(),
            }}
            testId="empty-search-distributors"
          />
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDistributors.map((distributor: Distributor) => (
              <Card key={distributor.id} data-testid={`card-distributor-${distributor.id}`}>
                <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Truck className="h-4 w-4 shrink-0" />
                        <span className="truncate">{distributor.name}</span>
                      </CardTitle>
                      {distributor.contactName && (
                        <CardDescription className="mt-1 flex items-center gap-2 text-xs sm:text-sm">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{distributor.contactName}</span>
                        </CardDescription>
                      )}
                      {distributor.email && (
                        <CardDescription className="mt-1 flex items-center gap-2 text-xs sm:text-sm">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{distributor.email}</span>
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-edit-${distributor.id}`}
                            onClick={() => handleOpenDialog(distributor)}
                            aria-label="Edit distributor"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit distributor</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-delete-${distributor.id}`}
                            onClick={() => handleDelete(distributor.id, distributor.name)}
                            disabled={deleteMutation.isPending}
                            aria-label="Delete distributor"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete distributor</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {distributor.vendorType && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        <Package className="h-3 w-3 mr-1 shrink-0" />
                        {distributor.vendorType === 'distributor' ? 'Distributor' : 
                         distributor.vendorType === 'manufacturer' ? 'Manufacturer' : 'Wholesaler'}
                      </Badge>
                    )}
                    {distributor.isPrimary && (
                      <Badge variant="default" className="text-xs shrink-0" data-testid={`badge-primary-${distributor.id}`}>
                        <Star className="h-3 w-3 mr-1 shrink-0" />
                        Primary
                      </Badge>
                    )}
                  </div>

                  {distributor.phone && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3 shrink-0" />
                        Phone
                      </p>
                      <p className="text-xs sm:text-sm ml-5">{distributor.phone}</p>
                    </div>
                  )}

                  {distributor.website && (
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Globe className="h-3 w-3 shrink-0" />
                        Website
                      </p>
                      <p className="text-xs sm:text-sm ml-5 truncate">
                        <a href={distributor.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {distributor.website}
                        </a>
                      </p>
                    </div>
                  )}

                  {distributor.accountNumber && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <FileText className="h-3 w-3 shrink-0" />
                        Account #
                      </p>
                      <p className="text-xs sm:text-sm ml-5">{distributor.accountNumber}</p>
                    </div>
                  )}

                  {distributor.regions && distributor.regions.length > 0 && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-3 w-3 shrink-0" />
                        Regions
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1 ml-5">
                        {distributor.regions.map((region, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs shrink-0">
                            {region}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator className="my-2 sm:my-3" />

                  <div className="space-y-1.5 sm:space-y-2">
                    <p className="text-xs sm:text-sm font-medium flex items-center gap-2">
                      <Calculator className="h-3 w-3 shrink-0" />
                      Pricing Details
                    </p>
                    <div className="ml-5 space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
                      {distributor.discountMultiplier && distributor.discountMultiplier.trim() !== "" && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Discount:</span>
                          <span className="text-right">{distributor.discountMultiplier}</span>
                        </div>
                      )}
                      {distributor.markupPercent !== null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Markup:</span>
                          <span className="text-right">{formatPercent(distributor.markupPercent)}</span>
                        </div>
                      )}
                      {distributor.flatFee !== null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Flat Fee:</span>
                          <span className="text-right">{formatPrice(distributor.flatFee)}</span>
                        </div>
                      )}
                      {distributor.shippingFeeAmount !== null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Shipping:</span>
                          <span className="text-right">
                            {distributor.shippingFeeType === 'percentage' 
                              ? formatPercent(distributor.shippingFeeAmount)
                              : formatPrice(distributor.shippingFeeAmount)}
                          </span>
                        </div>
                      )}
                      {distributor.handlingFee !== null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Handling:</span>
                          <span className="text-right">{formatPrice(distributor.handlingFee)}</span>
                        </div>
                      )}
                      {distributor.minimumOrderAmount !== null && (
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Min Order:</span>
                          <span className="text-right">{formatPrice(distributor.minimumOrderAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!distributor.isPrimary && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs sm:text-sm"
                      data-testid={`button-set-primary-${distributor.id}`}
                      onClick={() => handleSetPrimary(distributor.id, distributor.name)}
                      disabled={setPrimaryMutation.isPending}
                    >
                      {setPrimaryMutation.isPending ? (
                        <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                      ) : (
                        <Star className="h-4 w-4 sm:mr-2" />
                      )}
                      <span className="hidden sm:inline">Set as Primary</span>
                    </Button>
                  )}

                  {distributor.notes && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <FileText className="h-3 w-3 shrink-0" />
                        Notes
                      </p>
                      <p className="text-xs sm:text-sm line-clamp-2 ml-5 text-muted-foreground">{distributor.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                {editingDistributor ? (
                  <>
                    <Pencil className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span>Edit Distributor</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span>Add Distributor</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingDistributor
                  ? "Update distributor information and pricing details"
                  : "Add a new distributor for hardware procurement"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Distributor Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            data-testid="input-distributor-name"
                            placeholder="ABC Hardware Supply"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vendorType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Vendor Type
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "distributor"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-vendor-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="distributor">Distributor</SelectItem>
                            <SelectItem value="manufacturer">Manufacturer</SelectItem>
                            <SelectItem value="wholesaler">Wholesaler</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Contact Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
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
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            type="email"
                            data-testid="input-email"
                            placeholder="orders@abchardware.com"
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
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            data-testid="input-phone"
                            placeholder="(555) 123-4567"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Website
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            data-testid="input-website"
                            placeholder="https://www.example.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Account Number
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            data-testid="input-account-number"
                            placeholder="ACCT123456"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Payment Terms
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            data-testid="input-payment-terms"
                            placeholder="NET30, NET60, COD, etc."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-2 sm:space-y-3">
                  <h3 className="text-base sm:text-lg font-medium flex items-center gap-2">
                    <Calculator className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    Pricing Configuration
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Configure pricing structure for this distributor
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="discountMultiplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Discount Multiplier
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ""}
                              data-testid="input-discount-multiplier"
                              placeholder="0.50 or 50% or 50/10/5"
                            />
                          </FormControl>
                          <FormDescription>
                            Supports: decimal (0.50), percentage (50), or stacked (50/10/5)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="markupPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Markup Percent
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                              type="number"
                              step="0.01"
                              data-testid="input-markup-percent"
                              placeholder="15"
                            />
                          </FormControl>
                          <FormDescription>
                            Percentage markup on base price
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="flatFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Flat Fee
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                              type="number"
                              step="0.01"
                              data-testid="input-flat-fee"
                              placeholder="25.00"
                            />
                          </FormControl>
                          <FormDescription>
                            Fixed fee per order
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="handlingFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Handling Fee
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                              type="number"
                              step="0.01"
                              data-testid="input-handling-fee"
                              placeholder="10.00"
                            />
                          </FormControl>
                          <FormDescription>
                            Handling charge per order
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shippingFeeType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping Fee Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "flat"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-shipping-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="flat">Flat Amount</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shippingFeeAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Shipping Fee Amount
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                              type="number"
                              step="0.01"
                              data-testid="input-shipping-amount"
                              placeholder={form.watch("shippingFeeType") === "percentage" ? "5" : "50.00"}
                            />
                          </FormControl>
                          <FormDescription>
                            {form.watch("shippingFeeType") === "percentage" 
                              ? "Percentage of order total" 
                              : "Fixed shipping amount"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="minimumOrderAmount"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Minimum Order Amount
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value === "" ? null : parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                              type="number"
                              step="0.01"
                              data-testid="input-minimum-order"
                              placeholder="500.00"
                            />
                          </FormControl>
                          <FormDescription>
                            Minimum order value required
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Notes
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          data-testid="input-notes"
                          placeholder="Additional information about this distributor..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto text-xs sm:text-sm"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingDistributor(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full sm:w-auto text-xs sm:text-sm"
                    data-testid="button-submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingDistributor ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
