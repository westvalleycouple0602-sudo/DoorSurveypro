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
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  AlertTriangle,
  Search,
  Clock,
  Building2,
  TrendingUp,
  TrendingDown,
  FileSignature,
  User,
  CalendarClock,
  Send,
  Package,
  Wrench,
  HardHat,
  Boxes,
  MoreHorizontal,
  PlusCircle,
  MinusCircle,
  Edit3,
  X,
  Hash,
  Loader2
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { insertChangeOrderSchema, insertChangeOrderItemSchema, type ChangeOrder, type ChangeOrderItem, type Project } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const changeOrderFormSchema = insertChangeOrderSchema.extend({
  projectId: z.string().min(1, "Project is required"),
  costDelta: z.coerce.number().default(0),
});

const changeOrderItemFormSchema = insertChangeOrderItemSchema.extend({
  costBefore: z.coerce.number().default(0),
  costAfter: z.coerce.number().default(0),
  costDelta: z.coerce.number().default(0),
});

type ChangeOrderFormValues = z.infer<typeof changeOrderFormSchema>;
type ChangeOrderItemFormValues = z.infer<typeof changeOrderItemFormSchema>;

export default function ChangeOrders() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedChangeOrder, setSelectedChangeOrder] = useState<ChangeOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { 
    data: changeOrders = [], 
    isLoading,
    isError: ordersError,
    error: ordersErrorObj,
    refetch: refetchOrders
  } = useQuery<ChangeOrder[]>({
    queryKey: ["/api/change-orders"],
  });

  const { 
    data: projects = [],
    isError: projectsError,
    error: projectsErrorObj,
    refetch: refetchProjects
  } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const form = useForm<ChangeOrderFormValues>({
    resolver: zodResolver(changeOrderFormSchema),
    defaultValues: {
      projectId: "",
      title: "",
      description: "",
      status: "draft",
      reviewStatus: "pending",
      customerApprovalStatus: "pending",
      costDelta: 0,
    },
  });

  const itemForm = useForm<ChangeOrderItemFormValues>({
    resolver: zodResolver(changeOrderItemFormSchema),
    defaultValues: {
      itemType: "opening",
      action: "add",
      description: "",
      costBefore: 0,
      costAfter: 0,
      costDelta: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ChangeOrderFormValues) => {
      const res = await apiRequest("POST", "/api/change-orders", data);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Creation failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Change order created",
        description: "Order has been created and is ready for review",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to create change order",
        description: errorMessage.includes("project") || errorMessage.includes("not found")
          ? "Selected project not found. Please select a valid project"
          : errorMessage.includes("duplicate") || errorMessage.includes("exists")
          ? "A change order with this title already exists for this project"
          : errorMessage || "Unable to create change order. Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/change-orders/${id}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Deletion failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      toast({
        title: "Change order deleted",
        description: "Order has been successfully removed",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to delete change order",
        description: errorMessage.includes("not found") || errorMessage.includes("exist")
          ? "Change order not found. It may have been already deleted"
          : errorMessage.includes("items") || errorMessage.includes("cannot delete")
          ? "Cannot delete change order with existing items. Remove items first"
          : errorMessage || "Unable to delete change order. Please try again",
        variant: "destructive",
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/change-orders/${id}/submit`, {});
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Submission failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      toast({
        title: "Change order submitted",
        description: "Order has been submitted and is now pending review",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to submit change order",
        description: errorMessage.includes("already submitted") || errorMessage.includes("status")
          ? "Change order has already been submitted or is in review"
          : errorMessage.includes("empty") || errorMessage.includes("items")
          ? "Change order must have at least one item before submission"
          : errorMessage || "Unable to submit change order. Please try again",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("POST", `/api/change-orders/${id}/approve`, { reviewNotes: notes });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Approval failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      toast({
        title: "Change order approved",
        description: "Order has been approved and can proceed to customer approval",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to approve change order",
        description: errorMessage.includes("permission") || errorMessage.includes("unauthorized")
          ? "You don't have permission to approve change orders"
          : errorMessage.includes("status") || errorMessage.includes("already")
          ? "Change order is not in a state that can be approved"
          : errorMessage || "Unable to approve change order. Please try again",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("POST", `/api/change-orders/${id}/reject`, { reviewNotes: notes });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Rejection failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      toast({
        title: "Change order rejected",
        description: "Order has been rejected with feedback provided",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to reject change order",
        description: errorMessage.includes("permission") || errorMessage.includes("unauthorized")
          ? "You don't have permission to reject change orders"
          : errorMessage.includes("notes") || errorMessage.includes("required")
          ? "Rejection notes are required. Please provide feedback"
          : errorMessage || "Unable to reject change order. Please try again",
        variant: "destructive",
      });
    },
  });

  const customerApproveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("POST", `/api/change-orders/${id}/customer-approve`, { customerApprovalNotes: notes });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Customer approval failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      toast({
        title: "Customer approval recorded",
        description: "Change order has been approved by customer",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to approve change order",
        description: errorMessage.includes("not approved") || errorMessage.includes("review")
          ? "Change order must be approved by engineering before customer approval"
          : errorMessage.includes("already") || errorMessage.includes("duplicate")
          ? "Change order has already been approved by customer"
          : errorMessage || "Unable to record customer approval. Please try again",
        variant: "destructive",
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: ChangeOrderItemFormValues & { changeOrderId: string }) => {
      const res = await apiRequest("POST", `/api/change-orders/${data.changeOrderId}/items`, data);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Failed to add item");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-orders"] });
      setIsItemDialogOpen(false);
      itemForm.reset();
      toast({
        title: "Item added",
        description: "Line item has been added to change order",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to add item",
        description: errorMessage.includes("locked") || errorMessage.includes("submitted")
          ? "Cannot add items to a submitted change order"
          : errorMessage.includes("description") || errorMessage.includes("required")
          ? "Item description is required"
          : errorMessage || "Unable to add item to change order. Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ChangeOrderFormValues) => {
    createMutation.mutate(data);
  };

  const onItemSubmit = (data: ChangeOrderItemFormValues) => {
    if (selectedChangeOrder) {
      addItemMutation.mutate({ ...data, changeOrderId: selectedChangeOrder.id });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      draft: { label: "Draft", variant: "outline", icon: Edit3 },
      pending_review: { label: "Pending Review", variant: "secondary", icon: Clock },
      approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
      rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
      in_progress: { label: "In Progress", variant: "secondary", icon: Loader2 },
      completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" as const, icon: FileText };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} data-testid={`badge-status-${status}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const filteredChangeOrders = changeOrders.filter((co) => {
    if (!searchTerm) return true;
    const project = projects.find((p) => p.id === co.projectId);
    return (
      co.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      co.changeOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="loading-change-orders">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load change orders"
          message={ordersErrorObj instanceof Error ? ordersErrorObj.message : "Unable to fetch change orders"}
          error={ordersErrorObj as Error}
          onRetry={refetchOrders}
          testId="error-orders"
        />
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load projects"
          message={projectsErrorObj instanceof Error ? projectsErrorObj.message : "Unable to fetch projects. Some features may be limited"}
          error={projectsErrorObj as Error}
          onRetry={refetchProjects}
          testId="error-projects"
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6" data-testid="page-change-orders">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="heading-change-orders">Change Orders</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage project changes and modifications</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto text-xs sm:text-sm" data-testid="button-create-change-order">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
              New Change Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Change Order</DialogTitle>
              <DialogDescription>
                Create a new change order for a sold project
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            <SelectItem key={project.id} value={project.id} data-testid={`option-project-${project.id}`}>
                              {project.name}
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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Add door opening on 3rd floor" data-testid="input-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} placeholder="Describe the change..." rows={4} data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="costDelta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Delta</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-cost-delta" />
                      </FormControl>
                      <FormDescription>
                        Estimated cost change (positive for additional costs, negative for credits)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-change-order">
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Change Order
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 min-w-0">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">All Change Orders</CardTitle>
              <CardDescription className="text-xs sm:text-sm">View and manage project change orders</CardDescription>
            </div>
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Search change orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground" data-testid="loading-state">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mb-3" />
              <p className="text-sm sm:text-base">Loading change orders...</p>
            </div>
          ) : filteredChangeOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground" data-testid="empty-state">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-50" />
              <p className="text-base sm:text-lg font-medium mb-1">No change orders found</p>
              <p className="text-xs sm:text-sm">Create your first change order to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Hash className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs sm:text-sm">Number</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs sm:text-sm">Project</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs sm:text-sm">Title</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileSignature className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs sm:text-sm">Status</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs sm:text-sm">Review</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs sm:text-sm">Customer</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <DollarSign className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs sm:text-sm">Cost Delta</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs sm:text-sm">Created</span>
                        </div>
                      </TableHead>
                      <TableHead><span className="text-xs sm:text-sm">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
              <TableBody>
                {filteredChangeOrders.map((co) => {
                  const project = projects.find((p) => p.id === co.projectId);
                  return (
                    <TableRow key={co.id} data-testid={`row-change-order-${co.id}`}>
                      <TableCell className="font-mono text-xs sm:text-sm" data-testid={`cell-number-${co.id}`}>
                        {co.changeOrderNumber}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm" data-testid={`cell-project-${co.id}`}>{project?.name || "Unknown"}</TableCell>
                      <TableCell className="text-xs sm:text-sm" data-testid={`cell-title-${co.id}`}>{co.title}</TableCell>
                      <TableCell>{getStatusBadge(co.status)}</TableCell>
                      <TableCell>
                        {co.reviewStatus === "approved" && (
                          <Badge variant="default">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {co.reviewStatus === "rejected" && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                        {co.reviewStatus === "pending" && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {co.customerApprovalStatus === "approved" && (
                          <Badge variant="default">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {co.customerApprovalStatus === "rejected" && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                        {co.customerApprovalStatus === "pending" && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell data-testid={`cell-cost-${co.id}`}>
                        <div className="flex items-center gap-1 min-w-0">
                          {(co.costDelta ?? 0) > 0 ? (
                            <>
                              <TrendingUp className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              <span className="text-green-600 font-medium text-xs sm:text-sm">
                                +${Math.abs(co.costDelta ?? 0).toFixed(2)}
                              </span>
                            </>
                          ) : (co.costDelta ?? 0) < 0 ? (
                            <>
                              <TrendingDown className="h-3.5 w-3.5 text-red-600 shrink-0" />
                              <span className="text-red-600 font-medium text-xs sm:text-sm">
                                -${Math.abs(co.costDelta ?? 0).toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-xs sm:text-sm">$0.00</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm" data-testid={`cell-created-${co.id}`}>
                        {format(new Date(co.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedChangeOrder(co);
                              setIsViewDialogOpen(true);
                            }}
                            data-testid={`button-view-${co.id}`}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {co.status === "draft" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => submitMutation.mutate(co.id)}
                                disabled={submitMutation.isPending}
                                data-testid={`button-submit-${co.id}`}
                                title="Submit for Review"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(co.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${co.id}`}
                                title="Delete Change Order"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {co.status === "pending_review" && co.reviewStatus === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => approveMutation.mutate({ id: co.id })}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${co.id}`}
                                title="Approve Review"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => rejectMutation.mutate({ id: co.id })}
                                disabled={rejectMutation.isPending}
                                data-testid={`button-reject-${co.id}`}
                                title="Reject Review"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {co.reviewStatus === "approved" && co.customerApprovalStatus === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => customerApproveMutation.mutate({ id: co.id })}
                              disabled={customerApproveMutation.isPending}
                              data-testid={`button-customer-approve-${co.id}`}
                              title="Customer Approve"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
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

      {/* View Change Order Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Change Order Details</DialogTitle>
            <DialogDescription>
              {selectedChangeOrder?.changeOrderNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedChangeOrder && (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Project</Label>
                  <p className="text-xs sm:text-sm" data-testid="text-view-project">
                    {projects.find((p) => p.id === selectedChangeOrder.projectId)?.name || "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedChangeOrder.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Review Status</Label>
                  <p className="text-xs sm:text-sm" data-testid="text-review-status">
                    {selectedChangeOrder.reviewStatus}
                    {selectedChangeOrder.reviewedBy && ` by ${selectedChangeOrder.reviewedBy}`}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Customer Approval</Label>
                  <p className="text-xs sm:text-sm" data-testid="text-customer-approval">
                    {selectedChangeOrder.customerApprovalStatus}
                    {selectedChangeOrder.customerApprovedBy && ` by ${selectedChangeOrder.customerApprovedBy}`}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs sm:text-sm">Title</Label>
                <p className="text-xs sm:text-sm" data-testid="text-view-title">{selectedChangeOrder.title}</p>
              </div>

              {selectedChangeOrder.description && (
                <div>
                  <Label className="text-xs sm:text-sm">Description</Label>
                  <p className="text-xs sm:text-sm" data-testid="text-view-description">{selectedChangeOrder.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Cost Delta</Label>
                  <p className="text-base sm:text-lg font-semibold" data-testid="text-view-cost">
                    {(selectedChangeOrder.costDelta ?? 0) < 0 ? "-" : ""}${Math.abs(selectedChangeOrder.costDelta ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Created</Label>
                  <p className="text-xs sm:text-sm" data-testid="text-view-created">
                    {format(new Date(selectedChangeOrder.createdAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>

              {selectedChangeOrder.reviewNotes && (
                <div>
                  <Label className="text-xs sm:text-sm">Review Notes</Label>
                  <p className="text-xs sm:text-sm" data-testid="text-review-notes">{selectedChangeOrder.reviewNotes}</p>
                </div>
              )}

              {selectedChangeOrder.customerApprovalNotes && (
                <div>
                  <Label className="text-xs sm:text-sm">Customer Notes</Label>
                  <p className="text-xs sm:text-sm" data-testid="text-customer-notes">{selectedChangeOrder.customerApprovalNotes}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 sm:pt-4">
                <Button size="sm" variant="outline" onClick={() => setIsViewDialogOpen(false)} data-testid="button-close-view" className="w-full sm:w-auto text-xs sm:text-sm">
                  <X className="h-4 w-4 mr-2 shrink-0" />
                  Close
                </Button>
                {selectedChangeOrder.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setIsItemDialogOpen(true);
                      setIsViewDialogOpen(false);
                    }}
                    data-testid="button-add-item"
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    <PlusCircle className="h-4 w-4 mr-2 shrink-0" />
                    Add Item
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Change Order Item</DialogTitle>
            <DialogDescription>
              Add a line item to the change order
            </DialogDescription>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-4">
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
                        <SelectItem value="door_opening" data-testid="option-door-opening">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Door Opening</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="hardware" data-testid="option-hardware">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4" />
                            <span>Hardware</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="labor" data-testid="option-labor">
                          <div className="flex items-center gap-2">
                            <HardHat className="h-4 w-4" />
                            <span>Labor</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="material" data-testid="option-material">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>Material</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="other" data-testid="option-other">
                          <div className="flex items-center gap-2">
                            <Boxes className="h-4 w-4" />
                            <span>Other</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={itemForm.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-action">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="add" data-testid="option-add">
                          <div className="flex items-center gap-2">
                            <PlusCircle className="h-4 w-4" />
                            <span>Add</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="remove" data-testid="option-remove">
                          <div className="flex items-center gap-2">
                            <MinusCircle className="h-4 w-4" />
                            <span>Remove</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="modify" data-testid="option-modify">
                          <div className="flex items-center gap-2">
                            <Edit3 className="h-4 w-4" />
                            <span>Modify</span>
                          </div>
                        </SelectItem>
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
                      <Textarea {...field} placeholder="Item description..." rows={3} data-testid="input-item-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <FormField
                  control={itemForm.control}
                  name="costBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Cost Before</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" className="text-sm" data-testid="input-cost-before" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={itemForm.control}
                  name="costAfter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Cost After</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" className="text-sm" data-testid="input-cost-after" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={itemForm.control}
                  name="costDelta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Cost Delta</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="0.00" className="text-sm" data-testid="input-item-cost-delta" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button size="sm" type="button" variant="outline" onClick={() => setIsItemDialogOpen(false)} data-testid="button-cancel-item" className="w-full sm:w-auto text-xs sm:text-sm">
                  <X className="h-4 w-4 mr-2 shrink-0" />
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={addItemMutation.isPending} data-testid="button-submit-item" className="w-full sm:w-auto text-xs sm:text-sm">
                  {addItemMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4 mr-2 shrink-0" />
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
  );
}
