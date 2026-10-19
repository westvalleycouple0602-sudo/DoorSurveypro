import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Disclaimer, InsertDisclaimer } from "@shared/schema";
import { insertDisclaimerSchema } from "@shared/schema";
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
import { Plus, Edit, Trash2, FileText, AlertCircle, Shield, Ban, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDebounce } from "@/hooks/use-debounce";

const formSchema = insertDisclaimerSchema.extend({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["disclaimer", "addendum", "exclusion", "client-responsibility"]),
});

type FormData = z.infer<typeof formSchema>;

export default function DisclaimersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDisclaimer, setEditingDisclaimer] = useState<Disclaimer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const { toast } = useToast();

  const { 
    data: disclaimers = [], 
    isLoading,
    isError,
    error: errorObj,
    refetch
  } = useQuery<Disclaimer[]>({
    queryKey: ["/api/disclaimers"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "disclaimer",
      category: "",
      isActive: "yes",
      sortOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertDisclaimer) => apiRequest("POST", "/api/disclaimers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disclaimers"] });
      toast({ title: "Disclaimer created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create disclaimer", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertDisclaimer> }) =>
      apiRequest("PATCH", `/api/disclaimers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disclaimers"] });
      toast({ title: "Disclaimer updated successfully" });
      setIsDialogOpen(false);
      setEditingDisclaimer(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update disclaimer", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/disclaimers/${id}`, undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/disclaimers"] });
      toast({ title: "Disclaimer deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete disclaimer", variant: "destructive" });
    },
  });

  const handleSubmit = (data: FormData) => {
    if (editingDisclaimer) {
      updateMutation.mutate({ id: editingDisclaimer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (disclaimer: Disclaimer) => {
    setEditingDisclaimer(disclaimer);
    form.reset({
      title: disclaimer.title,
      content: disclaimer.content,
      type: disclaimer.type as "disclaimer" | "addendum" | "exclusion" | "client-responsibility",
      category: disclaimer.category || "",
      isActive: disclaimer.isActive || "yes",
      sortOrder: disclaimer.sortOrder || 0,
    });
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingDisclaimer(null);
    form.reset({
      title: "",
      content: "",
      type: "disclaimer",
      category: "",
      isActive: "yes",
      sortOrder: 0,
    });
    setIsDialogOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "disclaimer":
        return <FileText className="h-4 w-4" />;
      case "addendum":
        return <Plus className="h-4 w-4" />;
      case "exclusion":
        return <Ban className="h-4 w-4" />;
      case "client-responsibility":
        return <Shield className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "disclaimer":
        return "secondary";
      case "addendum":
        return "default";
      case "exclusion":
        return "destructive";
      case "client-responsibility":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Filter disclaimers based on search and type
  const filteredDisclaimers = disclaimers.filter(disclaimer => {
    const matchesSearch = debouncedSearch === "" ||
      disclaimer.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      disclaimer.content.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      disclaimer.type.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (disclaimer.category ?? "").toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesType = filterType === "all" || disclaimer.type === filterType;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-4 sm:space-y-6" data-testid="page-disclaimers">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Disclaimers & Addendums</h1>
          <p className="text-muted-foreground">
            Manage standard clauses for quotes, proposals, and documentation
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNew} data-testid="button-add-disclaimer" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Clause
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDisclaimer ? "Edit Clause" : "Add New Clause"}
              </DialogTitle>
              <DialogDescription>
                Create standard disclaimers, addendums, exclusions, or client responsibility statements
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Standard Warranty Disclaimer" data-testid="input-title" />
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
                      <FormLabel>Clause Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-clause-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="disclaimer">Disclaimer</SelectItem>
                          <SelectItem value="addendum">Addendum</SelectItem>
                          <SelectItem value="exclusion">Exclusion</SelectItem>
                          <SelectItem value="client-responsibility">Client Responsibility</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Disclaimers limit liability, addendums add terms, exclusions specify what's not included, and client responsibilities outline customer obligations
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="e.g., Fire Rating, Hardware, Installation" data-testid="input-category" />
                      </FormControl>
                      <FormDescription>
                        Group related clauses together for easier management
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clause Text</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={8}
                          placeholder="Enter the full text of the clause..."
                          data-testid="textarea-clause-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          data-testid="input-sort-order"
                        />
                      </FormControl>
                      <FormDescription>
                        Lower numbers appear first in documents
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingDisclaimer(null);
                      form.reset();
                    }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-disclaimer"
                  >
                    {editingDisclaimer ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clauses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
            data-testid="input-search-disclaimers"
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
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-64" data-testid="select-filter-type">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="disclaimer">Disclaimer</SelectItem>
            <SelectItem value="addendum">Addendum</SelectItem>
            <SelectItem value="exclusion">Exclusion</SelectItem>
            <SelectItem value="client-responsibility">Client Responsibility</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {(searchTerm || filterType !== "all") && (
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <span data-testid="text-results-count">
            Showing {filteredDisclaimers.length} of {disclaimers.length} clauses
          </span>
        </div>
      )}

      {isError ? (
        <ErrorState 
          error={errorObj as Error} 
          onRetry={refetch}
          message="Unable to load disclaimers. Please check your connection and try again."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-disclaimers" />
        </div>
      ) : filteredDisclaimers.length === 0 ? (
        <Card data-testid="card-empty-state">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm || filterType !== "all" ? "No Matching Clauses" : "No Clauses Yet"}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || filterType !== "all"
                ? "No clauses match your search or filter criteria"
                : "Create disclaimers, addendums, and other standard clauses for your quotes and proposals"}
            </p>
            {searchTerm || filterType !== "all" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterType("all");
                }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            ) : (
              <Button onClick={handleAddNew} data-testid="button-add-first-disclaimer">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Clause
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4" data-testid="list-disclaimers">
          {filteredDisclaimers.map((disclaimer) => (
            <Card key={disclaimer.id} data-testid={`card-disclaimer-${disclaimer.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{disclaimer.title}</CardTitle>
                      {disclaimer.isActive !== "yes" && (
                        <Badge variant="outline" data-testid="badge-inactive">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getTypeVariant(disclaimer.type)} className="flex items-center gap-1">
                        {getTypeIcon(disclaimer.type)}
                        {disclaimer.type}
                      </Badge>
                      {disclaimer.category && (
                        <Badge variant="outline">{disclaimer.category}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(disclaimer)}
                      aria-label="Edit clause"
                      data-testid={`button-edit-${disclaimer.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Delete clause"
                          data-testid={`button-delete-${disclaimer.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Clause?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{disclaimer.title}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(disclaimer.id)}
                            data-testid="button-confirm-delete"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{disclaimer.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
