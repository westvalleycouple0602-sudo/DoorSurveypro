import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";
import { 
  Plus, 
  FileDown, 
  Edit, 
  Trash2, 
  Eye, 
  ShoppingCart,
  Hash,
  Building2,
  Users,
  FileSignature,
  DollarSign,
  CalendarClock,
  Loader2,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Truck,
  Edit3,
  Search,
  Download,
  X
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertPurchaseOrderSchema, type PurchaseOrder, type Project, type ManufacturerContact, type QuoteRequest } from "@shared/schema";
import { z } from "zod";

const poFormSchema = insertPurchaseOrderSchema.extend({
  vendorContactId: z.string().min(1, "Vendor is required"),
  projectId: z.string().min(1, "Project is required"),
  taxRate: z.coerce.number(),
  shippingCost: z.coerce.number(),
  subtotal: z.coerce.number(),
  taxAmount: z.coerce.number(),
  totalAmount: z.coerce.number(),
});

type POFormValues = z.infer<typeof poFormSchema>;

export default function PurchaseOrders() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: purchaseOrders = [], isLoading, isError, error, refetch } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: vendors = [] } = useQuery<ManufacturerContact[]>({
    queryKey: ["/api/manufacturers"],
  });

  const { data: quoteRequests = [] } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
  });

  const form = useForm<POFormValues>({
    resolver: zodResolver(poFormSchema),
    defaultValues: {
      poNumber: "",
      projectId: "",
      vendorContactId: "",
      status: "draft",
      paymentTerms: "Net 30",
      taxRate: 0,
      shippingCost: 0,
      subtotal: 0,
      taxAmount: 0,
      totalAmount: 0,
    },
  });

  const createPOMutation = useMutation({
    mutationFn: async (data: POFormValues) => {
      return await apiRequest("POST", "/api/purchase-orders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Purchase order created successfully. You can now send it to the vendor.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create purchase order",
        description: error.message || "Unable to create purchase order. Verify all required fields are filled.",
        variant: "destructive",
      });
    },
  });

  const deletePOMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Success",
        description: "Purchase order deleted successfully. This action is permanent.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete purchase order",
        description: error.message || "This purchase order cannot be deleted. It may be referenced by shipments or invoices.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/purchase-orders/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Success",
        description: "Purchase order status updated successfully. Tracking information has been logged.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message || "Unable to update status. Invalid status transition.",
        variant: "destructive",
      });
    },
  });

  const createFromQuoteMutation = useMutation({
    mutationFn: async (quoteRequestId: string) => {
      return await apiRequest("POST", `/api/quote-requests/${quoteRequestId}/create-po`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      setIsQuoteDialogOpen(false);
      toast({
        title: "Success",
        description: "Purchase order created from quote request. Review and send to vendor.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create purchase order",
        description: error.message || "Unable to create PO from quote. The quote may be incomplete or already converted.",
        variant: "destructive",
      });
    },
  });

  const filteredPOs = purchaseOrders.filter((po) => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch.toLowerCase();
    return (
      po.poNumber.toLowerCase().includes(term) ||
      po.status.toLowerCase().includes(term)
    );
  });

  const onSubmit = (data: POFormValues) => {
    createPOMutation.mutate(data);
  };

  const handleDownloadPDF = (poId: string, poNumber: string) => {
    window.open(`/api/purchase-orders/${poId}/pdf`, '_blank');
  };

  const handleViewDetails = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      draft: { label: "Draft", variant: "outline", icon: Edit3 },
      sent: { label: "Sent", variant: "secondary", icon: Send },
      acknowledged: { label: "Acknowledged", variant: "default", icon: CheckCircle2 },
      ordered: { label: "Ordered", variant: "default", icon: CheckCircle2 },
      shipped: { label: "Shipped", variant: "default", icon: Truck },
      received: { label: "Received", variant: "default", icon: CheckCircle2 },
      cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" as const, icon: FileText };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="shrink-0 text-xs" data-testid={`badge-status-${status}`}>
        <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1 shrink-0" />
        {config.label}
      </Badge>
    );
  };

  // Show error state
  if (isError) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to load purchase orders"
            message={error instanceof Error ? error.message : "Unable to fetch purchase orders. Please check your connection and try again."}
            error={error as Error}
            onRetry={refetch}
            testId="error-purchase-orders"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-purchase-orders">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 space-y-3 sm:space-y-4 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">
            Purchase Orders
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground" data-testid="text-page-description">
            Create and manage purchase orders for vendors
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            className="w-full sm:w-auto text-xs sm:text-sm"
            size="sm"
            variant="outline"
            onClick={() => setIsQuoteDialogOpen(true)}
            data-testid="button-from-quote"
          >
            <ShoppingCart className="mr-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            From Quote
          </Button>
          <Button
            className="w-full sm:w-auto text-xs sm:text-sm"
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            data-testid="button-create-po"
          >
            <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            New PO
          </Button>
        </div>
      </div>

      {/* Create PO Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>
                Create a new purchase order for a vendor
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="poNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PO Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="e.g., PO-2025-001" 
                          data-testid="input-po-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name} - {project.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendorContactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vendor">
                            <SelectValue placeholder="Select vendor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(vendors) && vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.manufacturerName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="shipToName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ship To Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-ship-to-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shipToAttention"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attention</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} placeholder="Attn:" data-testid="input-ship-to-attention" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="shipToAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ship To Address</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-ship-to-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="shipToCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-ship-to-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shipToState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-ship-to-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shipToZip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-ship-to-zip" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "Net 30"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-terms">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Net 30">Net 30</SelectItem>
                            <SelectItem value="Net 60">Net 60</SelectItem>
                            <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                            <SelectItem value="COD">COD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shippingMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger data-testid="select-shipping-method">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ground">Ground</SelectItem>
                            <SelectItem value="expedited">Expedited</SelectItem>
                            <SelectItem value="will-call">Will Call</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="Special instructions or notes"
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPOMutation.isPending} data-testid="button-submit">
                    {createPOMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create PO
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Purchase Orders</CardTitle>
              <CardDescription className="text-xs sm:text-sm">View and manage all purchase orders</CardDescription>
            </div>
            <div className="relative w-full sm:w-56 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search PO #, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 sm:pl-9 text-xs sm:text-sm h-8 sm:h-9"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground" data-testid="loading-state">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mb-2 sm:mb-3" />
              <p className="text-xs sm:text-sm">Loading purchase orders...</p>
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground" data-testid="empty-state">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 mb-2 sm:mb-3 opacity-50" />
              <p className="text-sm sm:text-lg font-medium mb-1">No purchase orders found</p>
              <p className="text-xs sm:text-sm text-center">
                {searchTerm ? "Try adjusting your search criteria" : "Create your first purchase order to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <Hash className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          <span className="hidden sm:inline">PO Number</span>
                          <span className="sm:hidden">PO #</span>
                        </div>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <Building2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          Project
                        </div>
                      </TableHead>
                      <TableHead className="hidden xl:table-cell">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          Vendor
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <FileSignature className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          Status
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          Total
                        </div>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                          Date
                        </div>
                      </TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPOs.map((po) => {
                      const project = projects.find((p) => p.id === po.projectId);
                      const vendor = vendors.find((v) => v.id === po.vendorContactId);
                      
                      return (
                        <TableRow key={po.id} data-testid={`row-po-${po.id}`}>
                          <TableCell className="font-mono text-xs sm:text-sm" data-testid={`text-po-number-${po.id}`}>
                            {po.poNumber}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-xs sm:text-sm">{project?.name || "N/A"}</TableCell>
                          <TableCell className="hidden xl:table-cell text-xs sm:text-sm">{vendor?.manufacturerName || "N/A"}</TableCell>
                          <TableCell>
                            {getStatusBadge(po.status)}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm" data-testid={`text-total-${po.id}`}>
                            ${(po.totalAmount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5 sm:gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => handleViewDetails(po)}
                                data-testid={`button-view-${po.id}`}
                                title="View Details"
                                aria-label="View purchase order details"
                              >
                                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => handleDownloadPDF(po.id, po.poNumber)}
                                data-testid={`button-download-${po.id}`}
                                title="Download PDF"
                                aria-label="Download purchase order PDF"
                              >
                                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 sm:h-8 sm:w-8"
                                onClick={() => deletePOMutation.mutate(po.id)}
                                disabled={deletePOMutation.isPending}
                                data-testid={`button-delete-${po.id}`}
                                title="Delete Purchase Order"
                                aria-label="Delete purchase order"
                              >
                                {deletePOMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create from Quote Dialog */}
      <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Create PO from Quote Request</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Select a quote request to convert into a purchase order
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {quoteRequests.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                No quote requests available
              </p>
            ) : (
              quoteRequests.map((quote) => {
                const project = projects.find((p) => p.id === quote.projectId);
                const vendor = vendors.find((v) => v.id === quote.manufacturerContactId);
                
                return (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg border"
                    data-testid={`quote-card-${quote.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {project?.name || "Unknown Project"}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {vendor?.manufacturerName || "Unknown Vendor"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Status: {quote.status}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="shrink-0 text-xs sm:text-sm"
                      onClick={() => createFromQuoteMutation.mutate(quote.id)}
                      disabled={createFromQuoteMutation.isPending}
                      data-testid={`button-create-from-quote-${quote.id}`}
                    >
                      {createFromQuoteMutation.isPending ? (
                        <>
                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                          <span className="hidden sm:inline">Creating...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          <span className="hidden sm:inline">Create PO</span>
                          <span className="sm:hidden">Create</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Purchase Order Details</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedPO ? `PO #${selectedPO.poNumber}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm text-muted-foreground">Project</Label>
                  <p className="text-sm sm:text-base">{projects.find((p) => p.id === selectedPO.projectId)?.name || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm text-muted-foreground">Vendor</Label>
                  <p className="text-sm sm:text-base">{vendors.find((v) => v.id === selectedPO.vendorContactId)?.manufacturerName || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm text-muted-foreground">Status</Label>
                  <p className="mt-0.5">
                    {getStatusBadge(selectedPO.status)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm text-muted-foreground">Created</Label>
                  <p className="text-sm sm:text-base">{new Date(selectedPO.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              {selectedPO.shipToAddress && (
                <div>
                  <Label className="text-xs sm:text-sm text-muted-foreground">Ship To</Label>
                  <p className="text-sm sm:text-base">
                    {selectedPO.shipToName && <>{selectedPO.shipToName}<br /></>}
                    {selectedPO.shipToAddress}
                    {selectedPO.shipToCity && selectedPO.shipToState && (
                      <>, {selectedPO.shipToCity}, {selectedPO.shipToState} {selectedPO.shipToZip}</>
                    )}
                    {selectedPO.shipToAttention && <><br />Attn: {selectedPO.shipToAttention}</>}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm text-muted-foreground">Payment Terms</Label>
                  <p className="text-sm sm:text-base">{selectedPO.paymentTerms || "N/A"}</p>
                </div>
                {selectedPO.shippingMethod && (
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Shipping Method</Label>
                    <p className="text-sm sm:text-base">{selectedPO.shippingMethod}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 sm:pt-4">
                <div className="flex justify-between mb-1.5 sm:mb-2 text-xs sm:text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${(selectedPO.subtotal || 0).toFixed(2)}</span>
                </div>
                {(selectedPO.shippingCost || 0) > 0 && (
                  <div className="flex justify-between mb-1.5 sm:mb-2 text-xs sm:text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>${(selectedPO.shippingCost || 0).toFixed(2)}</span>
                  </div>
                )}
                {(selectedPO.taxAmount || 0) > 0 && (
                  <div className="flex justify-between mb-1.5 sm:mb-2 text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      Tax {selectedPO.taxRate ? `(${selectedPO.taxRate}%)` : ""}
                    </span>
                    <span>${(selectedPO.taxAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-sm sm:text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>${(selectedPO.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              {selectedPO.notes && (
                <div>
                  <Label className="text-xs sm:text-sm text-muted-foreground">Notes</Label>
                  <p className="text-sm sm:text-base whitespace-pre-wrap">{selectedPO.notes}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm"
                  onClick={() => handleDownloadPDF(selectedPO.id, selectedPO.poNumber)}
                  data-testid="button-download-pdf-dialog"
                >
                  <Download className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  Download PDF
                </Button>
                <Button size="sm" className="text-xs sm:text-sm" onClick={() => setIsViewDialogOpen(false)} data-testid="button-close-dialog">
                  <X className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
