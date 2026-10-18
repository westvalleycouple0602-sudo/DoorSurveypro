import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Users, Building2, MapPin, Mail, Phone, User, Calendar, Search, Loader2, X, Eye, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";
import { HubSpotIntegrationTab } from "@/components/HubSpotIntegrationTab";
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient } from "@/lib/queryClient";
import { 
  insertCustomerSchema, 
  insertCustomerLocationSchema,
  type InsertCustomer, 
  type Customer,
  type CustomerLocation,
  type InsertCustomerLocation 
} from "@shared/schema";

const customerTypes = [
  { value: "hospital-chain", label: "Hospital Chain" },
  { value: "hotel-chain", label: "Hotel Chain" },
  { value: "property-management", label: "Property Management" },
  { value: "government", label: "Government" },
  { value: "corporate", label: "Corporate" },
  { value: "other", label: "Other" },
];

export default function CustomersPage() {
  const { toast } = useToast();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [activeTab, setActiveTab] = useState("customers");
  
  // Location management state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editingLocation, setEditingLocation] = useState<CustomerLocation | null>(null);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);

  // Fetch user data to get organization and tier info
  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const organizationId = user?.organization?.id;
  const userRole = user?.role || "viewer";
  const subscriptionTier = user?.organization?.subscriptionTier || "free";
  
  // Show HubSpot tab for all authenticated users
  // Tier-specific features will be handled within the component
  const showHubSpotTab = !!user;

  const { data: customers, isLoading, isError, error, refetch } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      type: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      preferredManufacturers: [],
      notes: "",
    },
  });

  const locationForm = useForm<InsertCustomerLocation>({
    resolver: zodResolver(insertCustomerLocationSchema),
    defaultValues: {
      customerId: "",
      locationName: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "USA",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
    },
  });

  // Query for locations of selected customer
  const { data: locations } = useQuery<CustomerLocation[]>({
    queryKey: ["/api/customers", selectedCustomerId, "locations"],
    enabled: !!selectedCustomerId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create customer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ 
        title: "Success", 
        description: "Customer created successfully. You can now add locations and preferences." 
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create customer",
        description: error.message || "Unable to create customer. Please verify all required fields.",
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCustomer> }) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update customer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ 
        title: "Success", 
        description: "Customer updated successfully. Changes are now reflected across all projects." 
      });
      setIsDialogOpen(false);
      setEditingCustomer(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update customer",
        description: error.message || "Unable to save changes. This customer may be in use by active projects.",
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete customer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ 
        title: "Success", 
        description: "Customer deleted successfully. All associated data has been removed." 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete customer",
        description: error.message || "This customer cannot be deleted because it's referenced by existing projects or locations.",
        variant: "destructive" 
      });
    },
  });

  // Location mutations
  const createLocationMutation = useMutation({
    mutationFn: async (data: InsertCustomerLocation) => {
      const response = await fetch(`/api/customers/${data.customerId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create location");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", selectedCustomerId, "locations"] });
      toast({ title: "Location created successfully" });
      setIsLocationDialogOpen(false);
      locationForm.reset();
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertCustomerLocation> }) => {
      const response = await fetch(`/api/customer-locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update location");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", selectedCustomerId, "locations"] });
      toast({ title: "Location updated successfully" });
      setIsLocationDialogOpen(false);
      setEditingLocation(null);
      locationForm.reset();
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/customer-locations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete location");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", selectedCustomerId, "locations"] });
      toast({ title: "Location deleted successfully" });
    },
  });

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      form.reset({
        name: customer.name,
        type: customer.type || "",
        contactName: customer.contactName || "",
        contactEmail: customer.contactEmail || "",
        contactPhone: customer.contactPhone || "",
        preferredManufacturers: customer.preferredManufacturers || [],
        notes: customer.notes || "",
      });
    } else {
      setEditingCustomer(null);
      form.reset({
        name: "",
        type: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        preferredManufacturers: [],
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: InsertCustomer) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this customer? This will not delete associated projects.")) {
      deleteMutation.mutate(id);
    }
  };

  // Location handlers
  const handleOpenLocationDialog = (customerId: string, location?: CustomerLocation) => {
    setSelectedCustomerId(customerId);
    if (location) {
      setEditingLocation(location);
      locationForm.reset({
        customerId,
        locationName: location.locationName,
        address: location.address || "",
        city: location.city || "",
        state: location.state || "",
        zip: location.zip || "",
        country: location.country || "USA",
        contactName: location.contactName || "",
        contactPhone: location.contactPhone || "",
        contactEmail: location.contactEmail || "",
      });
    } else {
      setEditingLocation(null);
      locationForm.reset({
        customerId,
        locationName: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        country: "USA",
        contactName: "",
        contactPhone: "",
        contactEmail: "",
      });
    }
    setIsLocationDialogOpen(true);
  };

  const handleLocationSubmit = (data: InsertCustomerLocation) => {
    if (editingLocation) {
      updateLocationMutation.mutate({ id: editingLocation.id, data });
    } else {
      createLocationMutation.mutate(data);
    }
  };

  const handleDeleteLocation = (id: string) => {
    if (confirm("Are you sure you want to delete this location?")) {
      deleteLocationMutation.mutate(id);
    }
  };

  const handleViewLocations = (customerId: string) => {
    setSelectedCustomerId(customerId);
  };

  const filteredCustomers = customers?.filter((customer) => {
    if (!debouncedSearch) return true;
    return (
      customer.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      customer.contactName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      customer.contactEmail?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      customer.type?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }) || [];

  // Show error state
  if (isError) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to load customers"
            message={error instanceof Error ? error.message : "Unable to fetch customers. Please check your connection and try again."}
            error={error as Error}
            onRetry={refetch}
            testId="error-customers"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" data-testid="loading-state">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p>Loading customers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-customers">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 shrink-0" />
              Customers
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage customer organizations and track their preferences
            </p>
          </div>
          {activeTab === "customers" && (
            <Button className="w-full sm:w-auto text-xs sm:text-sm shrink-0" size="sm" data-testid="button-add-customer" onClick={() => handleOpenDialog()}>
              <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Add Customer
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="customers" className="text-xs sm:text-sm" data-testid="tab-customers">
              <Building2 className="h-4 w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Customers</span>
            </TabsTrigger>
            {showHubSpotTab && (
              <TabsTrigger value="hubspot" className="text-xs sm:text-sm" data-testid="tab-hubspot">
                <Zap className="h-4 w-4 sm:mr-2 shrink-0" />
                <span className="hidden sm:inline">HubSpot Integration</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="customers" className="space-y-4 mt-4 sm:mt-6">{/* Customers Tab Content */}

        <Card>
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg">All Customers</CardTitle>
                <CardDescription className="text-xs sm:text-sm">View and manage customer organizations</CardDescription>
              </div>
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">

        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground" data-testid="empty-state">
            <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-50" />
            <p className="text-base sm:text-lg font-medium mb-1">No customers found</p>
            <p className="text-xs sm:text-sm text-center px-4">
              {searchTerm 
                ? "Try adjusting your search terms" 
                : "Add your first customer to begin tracking preferences and project history"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} data-testid={`card-customer-${customer.id}`}>
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                        <CardTitle className="text-sm sm:text-lg truncate">{customer.name}</CardTitle>
                      </div>
                      {customer.type && (
                        <Badge variant="secondary" className="mb-2">
                          <Building2 className="h-3 w-3 mr-1" />
                          {customerTypes.find((t) => t.value === customer.type)?.label || customer.type}
                        </Badge>
                      )}
                      {customer.contactName && (
                        <CardDescription className="mt-1 flex items-center gap-1">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{customer.contactName}</span>
                        </CardDescription>
                      )}
                      {customer.contactEmail && (
                        <CardDescription className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{customer.contactEmail}</span>
                        </CardDescription>
                      )}
                      {customer.contactPhone && (
                        <CardDescription className="flex items-center gap-1 truncate">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{customer.contactPhone}</span>
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-edit-${customer.id}`}
                        onClick={() => handleOpenDialog(customer)}
                        title="Edit Customer"
                        aria-label="Edit customer"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-delete-${customer.id}`}
                        onClick={() => handleDelete(customer.id)}
                        disabled={deleteMutation.isPending}
                        title="Delete Customer"
                        aria-label="Delete customer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 space-y-2 sm:space-y-3">
                  {customer.preferredManufacturers && customer.preferredManufacturers.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm text-muted-foreground">Preferred Manufacturers:</p>
                      <div className="flex flex-wrap gap-1">
                        {customer.preferredManufacturers.map((mfr, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs shrink-0">
                            {mfr}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {customer.notes && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 line-clamp-2">{customer.notes}</p>
                  )}
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs sm:text-sm"
                      data-testid={`button-manage-locations-${customer.id}`}
                      onClick={() => {
                        handleViewLocations(customer.id);
                        handleOpenLocationDialog(customer.id);
                      }}
                    >
                      <MapPin className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      Manage Locations
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingCustomer
                  ? "Update customer information and preferences"
                  : "Add a new customer organization to track preferences"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Building2 className="inline-block h-4 w-4 mr-1 mb-0.5" />
                        Customer Name*
                      </FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-customer-name"
                          placeholder="ABC Hospital System"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer-type">
                            <SelectValue placeholder="Select customer type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customerTypes.map((type) => (
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">
                          <User className="inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 mb-0.5" />
                          Contact Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-contact-name"
                            placeholder="John Smith"
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
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">
                          <Phone className="inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 mb-0.5" />
                          Contact Phone
                        </FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-contact-phone"
                            placeholder="555-1234"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Mail className="inline-block h-4 w-4 mr-1 mb-0.5" />
                        Contact Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-contact-email"
                          type="email"
                          placeholder="contact@example.com"
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
                  name="preferredManufacturers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Manufacturers</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-preferred-manufacturers"
                          placeholder="ABH, Trimco, Rockwood (comma-separated)"
                          value={field.value?.join(", ") || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            const manufacturers = value
                              .split(",")
                              .map((m) => m.trim())
                              .filter((m) => m.length > 0);
                            field.onChange(manufacturers);
                          }}
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
                        <Textarea
                          data-testid="input-customer-notes"
                          placeholder="Additional notes about customer preferences or requirements"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    <X className="h-4 w-4 sm:mr-2 shrink-0" />
                    <span className="hidden sm:inline">Cancel</span>
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs sm:text-sm"
                    data-testid="button-save-customer"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:mr-2 animate-spin shrink-0" />
                        <span className="hidden sm:inline">Saving...</span>
                      </>
                    ) : editingCustomer ? (
                      <>
                        <Edit className="h-4 w-4 sm:mr-2 shrink-0" />
                        <span className="hidden sm:inline">Update Customer</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 sm:mr-2 shrink-0" />
                        <span className="hidden sm:inline">Create Customer</span>
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Location Management Dialog */}
        <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {editingLocation
                  ? "Update location information"
                  : "Add a new location for this customer"}
              </DialogDescription>
            </DialogHeader>

            {/* Display existing locations */}
            {!editingLocation && locations && locations.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs sm:text-sm font-medium">Existing Locations:</p>
                {locations.map((loc) => (
                  <Card key={loc.id} className="p-2 sm:p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{loc.locationName}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {[loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(", ")}
                        </p>
                        {loc.contactName && (
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{loc.contactName}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenLocationDialog(loc.customerId, loc)}
                          title="Edit Location"
                          aria-label="Edit location"
                          data-testid={`button-edit-location-${loc.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteLocation(loc.id)}
                          disabled={deleteLocationMutation.isPending}
                          title="Delete Location"
                          aria-label="Delete location"
                          data-testid={`button-delete-location-${loc.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <Form {...locationForm}>
              <form onSubmit={locationForm.handleSubmit(handleLocationSubmit)} className="space-y-4">
                <FormField
                  control={locationForm.control}
                  name="locationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <MapPin className="inline-block h-4 w-4 mr-1 mb-0.5" />
                        Location Name*
                      </FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-location-name"
                          placeholder="Main Campus, North Building, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={locationForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-location-address"
                          placeholder="123 Main St"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <FormField
                    control={locationForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-location-city"
                            placeholder="City"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={locationForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-location-state"
                            placeholder="State"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={locationForm.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP</FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-location-zip"
                            placeholder="ZIP"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={locationForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-location-country"
                          placeholder="USA"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField
                    control={locationForm.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">
                          <User className="inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 mb-0.5" />
                          Location Contact Name
                        </FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-location-contact-name"
                            placeholder="John Smith"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={locationForm.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">
                          <Phone className="inline-block h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 mb-0.5" />
                          Location Contact Phone
                        </FormLabel>
                        <FormControl>
                          <Input
                            data-testid="input-location-contact-phone"
                            placeholder="555-1234"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={locationForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Mail className="inline-block h-4 w-4 mr-1 mb-0.5" />
                        Location Contact Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-location-contact-email"
                          type="email"
                          placeholder="contact@example.com"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm"
                    onClick={() => {
                      setIsLocationDialogOpen(false);
                      setEditingLocation(null);
                      locationForm.reset();
                    }}
                    data-testid="button-cancel-location"
                  >
                    <X className="h-4 w-4 sm:mr-2 shrink-0" />
                    <span className="hidden sm:inline">Cancel</span>
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="text-xs sm:text-sm"
                    data-testid="button-save-location"
                    disabled={createLocationMutation.isPending || updateLocationMutation.isPending}
                  >
                    {createLocationMutation.isPending || updateLocationMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:mr-2 animate-spin shrink-0" />
                        <span className="hidden sm:inline">Saving...</span>
                      </>
                    ) : editingLocation ? (
                      <>
                        <Edit className="h-4 w-4 sm:mr-2 shrink-0" />
                        <span className="hidden sm:inline">Update Location</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 sm:mr-2 shrink-0" />
                        <span className="hidden sm:inline">Create Location</span>
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
          </TabsContent>

          {/* HubSpot Integration Tab */}
          {showHubSpotTab && (
            <TabsContent value="hubspot" className="mt-6">
              {organizationId && (
                <HubSpotIntegrationTab 
                  organizationId={organizationId} 
                  userRole={userRole}
                  subscriptionTier={subscriptionTier}
                />
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
