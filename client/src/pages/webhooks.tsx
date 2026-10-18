import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWebhookSchema, type InsertWebhook, type Webhook } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit, Send, Globe, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";

// Client-side webhook schema (omit server-side fields)
const clientWebhookSchema = insertWebhookSchema.omit({
  organizationId: true,
  createdBy: true,
});

type ClientWebhook = z.infer<typeof clientWebhookSchema>;

// Update schema for webhooks (partial insert schema)
const updateWebhookSchema = insertWebhookSchema.partial().omit({
  organizationId: true,
  createdBy: true,
});

type UpdateWebhook = z.infer<typeof updateWebhookSchema>;

// Available webhook event types
const WEBHOOK_EVENTS = [
  { id: "webhook.test", label: "Test Event", description: "Test webhook delivery" },
  { id: "project.created", label: "Project Created", description: "Triggered when a new project is created" },
  { id: "project.updated", label: "Project Updated", description: "Triggered when a project is updated" },
  { id: "project.deleted", label: "Project Deleted", description: "Triggered when a project is deleted" },
  { id: "opening.created", label: "Opening Created", description: "Triggered when a new opening is created" },
  { id: "opening.updated", label: "Opening Updated", description: "Triggered when an opening is updated" },
  { id: "photo.uploaded", label: "Photo Uploaded", description: "Triggered when a photo is uploaded" },
  { id: "quote.created", label: "Quote Created", description: "Triggered when a quote is generated" },
];

// Normalize events to string array (handle both string[] and any other JSONB formats)
function normalizeEvents(events: any): string[] {
  if (!events) return [];
  if (Array.isArray(events)) {
    // If array of strings, return as-is
    if (events.every(e => typeof e === 'string')) {
      return events;
    }
    // If array of objects with id field, extract ids
    if (events.every(e => typeof e === 'object' && e?.id)) {
      return events.map(e => e.id);
    }
  }
  return [];
}

export default function WebhooksPage() {
  const { toast } = useToast();
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  // Fetch webhooks
  const { data: webhooks, isLoading, isError, error } = useQuery<Webhook[]>({
    queryKey: ["/api/webhooks"],
  });

  // Ensure webhooks is always an array
  const webhooksList = Array.isArray(webhooks) ? webhooks : [];

  const form = useForm<ClientWebhook>({
    resolver: zodResolver(clientWebhookSchema),
    defaultValues: {
      name: "",
      url: "",
      events: [],
      isActive: "yes",
      retryAttempts: 3,
      timeoutSeconds: 30,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientWebhook) => {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create webhook");
      }
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      
      // Show secret warning toast
      toast({
        title: "Webhook created successfully",
        description: data.secret 
          ? `Secret: ${data.secret} - Save this now, you won't see it again!` 
          : "Webhook created",
        duration: 10000,
      });
      
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create webhook",
        description: error.message || "Please check the form and try again",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWebhook }) => {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update webhook");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({
        title: "Success",
        description: "Webhook updated successfully",
      });
      setIsDialogOpen(false);
      setEditingWebhook(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update webhook",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete webhook");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({
        title: "Success",
        description: "Webhook deleted successfully",
      });
      setDeleteConfirm(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete webhook",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setDeleteConfirm(null);
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestingWebhookId(id);
      const response = await fetch(`/api/webhooks/${id}/test`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Failed to send test webhook");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({
        title: "Test webhook sent",
        description: "Check your endpoint for the test payload",
      });
      setTestingWebhookId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Test webhook failed",
        description: error.message || "The webhook endpoint did not respond successfully",
        variant: "destructive",
      });
      setTestingWebhookId(null);
    },
  });

  const handleSubmit = (data: ClientWebhook) => {
    if (editingWebhook) {
      // For updates, only send fields that can be updated
      const updateData: UpdateWebhook = {
        name: data.name,
        url: data.url,
        events: data.events,
        isActive: data.isActive,
        retryAttempts: data.retryAttempts,
        timeoutSeconds: data.timeoutSeconds,
      };
      updateMutation.mutate({ id: editingWebhook.id, data: updateData });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    form.reset({
      name: webhook.name,
      url: webhook.url,
      events: normalizeEvents(webhook.events), // Normalize events to string[]
      isActive: webhook.isActive as "yes" | "no",
      retryAttempts: webhook.retryAttempts,
      timeoutSeconds: webhook.timeoutSeconds,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const handleTestWebhook = (id: string) => {
    testWebhookMutation.mutate(id);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="min-w-0">
            <Skeleton className="h-7 sm:h-9 w-36 sm:w-48 mb-2" />
            <Skeleton className="h-4 sm:h-5 w-64 sm:w-96" />
          </div>
          <Skeleton className="h-8 sm:h-10 w-32 sm:w-40 shrink-0" />
        </div>
        <div className="grid gap-3 sm:gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="p-3 sm:p-4">
                <Skeleton className="h-5 sm:h-6 w-48 sm:w-64 mb-2" />
                <Skeleton className="h-3 sm:h-4 w-64 sm:w-96" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j}>
                      <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 mb-2" />
                      <Skeleton className="h-5 sm:h-6 w-12 sm:w-16" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="text-center text-destructive text-sm sm:text-base">
          Error loading webhooks: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Configure webhooks to receive real-time notifications about events in your organization
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingWebhook(null);
            form.reset();
            setIsDialogOpen(true);
          }}
          data-testid="button-create-webhook"
          className="shrink-0 text-xs sm:text-sm"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 shrink-0" />
          Create Webhook
        </Button>
      </div>

      {webhooksList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
            <Globe className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4 shrink-0" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No webhooks configured</h3>
            <p className="text-xs sm:text-sm text-muted-foreground text-center mb-3 sm:mb-4">
              Create your first webhook to start receiving event notifications
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingWebhook(null);
                form.reset();
                setIsDialogOpen(true);
              }}
              data-testid="button-create-first-webhook"
              className="text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 shrink-0" />
              Create Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {webhooksList.map((webhook) => {
            const normalizedEvents = normalizeEvents(webhook.events);
            const isTestingThis = testingWebhookId === webhook.id;
            
            return (
              <Card key={webhook.id} data-testid={`card-webhook-${webhook.id}`}>
                <CardHeader className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm sm:text-base truncate">{webhook.name}</CardTitle>
                        <Badge variant={webhook.isActive === "yes" ? "default" : "secondary"} className="shrink-0 text-xs">
                          {webhook.isActive === "yes" ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <Globe className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        <span className="truncate">{webhook.url}</span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-1.5 sm:gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestWebhook(webhook.id)}
                        disabled={isTestingThis}
                        data-testid={`button-test-webhook-${webhook.id}`}
                        className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                      >
                        {isTestingThis ? (
                          <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(webhook)}
                        data-testid={`button-edit-webhook-${webhook.id}`}
                        className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                      >
                        <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(webhook.id, webhook.name)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-webhook-${webhook.id}`}
                        className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    <div>
                      <p className="text-xs sm:text-sm font-medium mb-1">Subscribed Events:</p>
                      <div className="flex flex-wrap gap-1">
                        {normalizedEvents.length > 0 ? (
                          normalizedEvents.map((event) => (
                            <Badge key={event} variant="outline" data-testid={`badge-event-${event}`} className="text-xs shrink-0">
                              {event}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs sm:text-sm text-muted-foreground">No events selected</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Success Count</p>
                        <div className="flex items-center gap-1 mt-1 min-w-0">
                          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                          <span className="font-medium text-sm sm:text-base" data-testid={`text-success-count-${webhook.id}`}>
                            {webhook.successCount ?? 0}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Failure Count</p>
                        <div className="flex items-center gap-1 mt-1 min-w-0">
                          <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive shrink-0" />
                          <span className="font-medium text-sm sm:text-base" data-testid={`text-failure-count-${webhook.id}`}>
                            {webhook.failureCount ?? 0}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Triggered</p>
                        <div className="flex items-center gap-1 mt-1 min-w-0">
                          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span className="text-xs sm:text-sm truncate" data-testid={`text-last-triggered-${webhook.id}`}>
                            {formatDate(webhook.lastTriggeredAt)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Settings</p>
                        <p className="text-xs sm:text-sm mt-1" data-testid={`text-settings-${webhook.id}`}>
                          {webhook.retryAttempts ?? 3} retries, {webhook.timeoutSeconds ?? 30}s timeout
                        </p>
                      </div>
                    </div>
                    {webhook.lastFailureReason && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded-md">
                        <p className="text-xs text-destructive font-medium">Last Failure:</p>
                        <p className="text-xs text-destructive/80 mt-1 break-words" data-testid={`text-last-failure-${webhook.id}`}>
                          {webhook.lastFailureReason}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[60] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{editingWebhook ? "Edit Webhook" : "Create Webhook"}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Configure a webhook endpoint to receive real-time notifications about events
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 sm:space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Production Webhook" 
                        {...field} 
                        data-testid="input-webhook-name"
                        className="text-sm"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">A friendly name to identify this webhook</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Webhook URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://api.example.com/webhooks"
                        {...field}
                        data-testid="input-webhook-url"
                        className="text-sm"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">The endpoint that will receive webhook POST requests</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="events"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Event Subscriptions</FormLabel>
                    <FormDescription className="text-xs">Select the events you want to receive notifications for</FormDescription>
                    <div className="space-y-2 mt-2">
                      {WEBHOOK_EVENTS.map((event) => (
                        <FormField
                          key={event.id}
                          control={form.control}
                          name="events"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={event.id}
                                className="flex flex-row items-start space-x-2 sm:space-x-3 space-y-0 rounded-md border p-2 sm:p-3"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(event.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, event.id])
                                        : field.onChange(field.value?.filter((value) => value !== event.id));
                                    }}
                                    data-testid={`checkbox-event-${event.id}`}
                                    className="shrink-0 mt-0.5"
                                  />
                                </FormControl>
                                <div className="space-y-0.5 sm:space-y-1 leading-none min-w-0">
                                  <FormLabel className="font-medium text-xs sm:text-sm">{event.label}</FormLabel>
                                  <p className="text-xs text-muted-foreground">{event.description}</p>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="retryAttempts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Retry Attempts</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-retry-attempts"
                          className="text-sm"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Number of retry attempts on failure</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeoutSeconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">Timeout (seconds)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="5"
                          max="120"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-timeout-seconds"
                          className="text-sm"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">Request timeout in seconds</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4 gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <FormLabel className="text-sm sm:text-base">Active</FormLabel>
                      <FormDescription className="text-xs sm:text-sm">Enable or disable this webhook</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === "yes"}
                        onCheckedChange={(checked) => field.onChange(checked ? "yes" : "no")}
                        data-testid="switch-webhook-active"
                        className="shrink-0"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0 flex-col-reverse sm:flex-row">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingWebhook(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-webhook"
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  {editingWebhook ? "Update Webhook" : "Create Webhook"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent data-testid="dialog-delete-webhook" className="p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-delete" className="text-xs sm:text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
              className="text-xs sm:text-sm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
