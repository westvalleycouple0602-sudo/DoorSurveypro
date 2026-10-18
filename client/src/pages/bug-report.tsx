import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bug, AlertCircle, CheckCircle2, Clock, AlertTriangle, Loader2, Upload, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertBugReportSchema, type BugReport } from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  severity: z.string().min(1, "Severity is required"),
  platform: z.string().min(1, "Platform is required"),
  status: z.string(),
  page: z.string().nullable(),
  userAgent: z.string().nullable(),
  browserInfo: z.string().nullable(),
  projectId: z.string().nullable(),
  scanId: z.string().nullable(),
  lidarScanId: z.string().nullable(),
  screenshotUrl: z.string().nullable(),
  extra: z.string().nullable(),
  assignedTo: z.string().nullable(),
  notes: z.string().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

const severityConfig = {
  critical: { icon: AlertCircle, label: "Critical", color: "text-red-500" },
  high: { icon: AlertTriangle, label: "High", color: "text-orange-500" },
  medium: { icon: Clock, label: "Medium", color: "text-yellow-500" },
  low: { icon: CheckCircle2, label: "Low", color: "text-blue-500" },
};

const statusConfig = {
  new: { label: "New", variant: "default" as const },
  open: { label: "Open", variant: "default" as const },
  "in-progress": { label: "In Progress", variant: "secondary" as const },
  resolved: { label: "Resolved", variant: "secondary" as const },
  closed: { label: "Closed", variant: "outline" as const },
};

export default function BugReportPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("submit");

  // Get browser and system information
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    const platform = navigator.platform || "Unknown";
    return {
      userAgent: ua,
      platform,
      browserInfo: {
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
        },
      },
    };
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      severity: "medium",
      platform: getBrowserInfo().platform,
      status: "new",
      page: window.location.pathname,
      userAgent: getBrowserInfo().userAgent,
      browserInfo: JSON.stringify(getBrowserInfo().browserInfo),
      projectId: null,
      scanId: null,
      lidarScanId: null,
      screenshotUrl: null,
      extra: null,
      assignedTo: null,
      notes: null,
    },
  });

  const createBugMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      return await apiRequest("POST", "/api/bugs", values);
    },
    onSuccess: () => {
      toast({
        title: "Bug report submitted",
        description: "Thank you for helping us improve DoorSurvey Pro!",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
      setSelectedTab("list");
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        title: "Failed to submit bug report",
        description: errorMessage.includes("duplicate") || errorMessage.includes("already")
          ? "A similar bug report may already exist. Check the list below"
          : errorMessage || "Unable to submit bug report. Please try again",
      });
    },
  });

  const { 
    data: bugs = [], 
    isLoading: isLoadingBugs,
    isError: bugsError,
    error: bugsErrorObj,
    refetch: refetchBugs
  } = useQuery<BugReport[]>({
    queryKey: ["/api/bugs"],
    enabled: selectedTab === "list",
  });

  const updateBugMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BugReport> }) => {
      return await apiRequest("PATCH", `/api/bugs/${id}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Bug updated",
        description: "Bug report has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        title: "Failed to update bug",
        description: errorMessage.includes("not found") || errorMessage.includes("exist")
          ? "Bug report not found. It may have been deleted"
          : errorMessage || "Unable to update bug report. Please try again",
      });
    },
  });

  const deleteBugMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/bugs/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Bug deleted",
        description: "Bug report has been removed from the system",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bugs"] });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        title: "Failed to delete bug",
        description: errorMessage.includes("not found") || errorMessage.includes("exist")
          ? "Bug report not found. It may have been already deleted"
          : errorMessage || "Unable to delete bug report. Please try again",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    createBugMutation.mutate(values);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bug className="w-8 h-8" />
          Bug Reports
        </h1>
        <p className="text-muted-foreground mt-2">
          Report issues and track bugs in DoorSurvey Pro
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="submit" data-testid="tab-submit-bug">
            Submit Bug
          </TabsTrigger>
          <TabsTrigger value="list" data-testid="tab-bug-list">
            All Bugs ({bugs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit">
          <Card>
            <CardHeader>
              <CardTitle>Submit a Bug Report</CardTitle>
              <CardDescription>
                Help us improve by reporting any issues you encounter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Brief description of the issue"
                            data-testid="input-bug-title"
                          />
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
                          <Textarea
                            {...field}
                            placeholder="Detailed description of the issue, steps to reproduce, and expected vs actual behavior"
                            rows={6}
                            data-testid="input-bug-description"
                          />
                        </FormControl>
                        <FormDescription>
                          Please include steps to reproduce and what you expected to happen
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severity</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-bug-severity">
                                <SelectValue placeholder="Select severity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low - Minor inconvenience</SelectItem>
                              <SelectItem value="medium">Medium - Moderate impact</SelectItem>
                              <SelectItem value="high">High - Major issue</SelectItem>
                              <SelectItem value="critical">Critical - System broken</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="platform"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Platform</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Windows, Mac, iOS"
                              data-testid="input-bug-platform"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="screenshotUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Screenshot URL (optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ""}
                            placeholder="https://example.com/screenshot.png"
                            data-testid="input-bug-screenshot"
                          />
                        </FormControl>
                        <FormDescription>
                          Upload your screenshot to an image hosting service and paste the URL
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="submit"
                      disabled={createBugMutation.isPending}
                      className="w-full sm:w-auto"
                      data-testid="button-submit-bug"
                    >
                      {createBugMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Bug Report"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                      className="w-full sm:w-auto"
                      data-testid="button-reset-form"
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Bug Reports</CardTitle>
              <CardDescription>
                All bug reports submitted by your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bugsError ? (
                <ErrorState 
                  error={bugsErrorObj as Error} 
                  onRetry={refetchBugs}
                  message="Unable to load bug reports. This could be due to a network issue or server error."
                />
              ) : isLoadingBugs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : bugs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bug className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No bug reports yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bugs.map((bug) => {
                    const SeverityIcon = severityConfig[bug.severity as keyof typeof severityConfig]?.icon || Clock;
                    const severityColor = severityConfig[bug.severity as keyof typeof severityConfig]?.color || "text-gray-500";
                    const statusVariant = statusConfig[bug.status as keyof typeof statusConfig]?.variant || "default";

                    return (
                      <div
                        key={bug.id}
                        className="border rounded-lg p-4 hover-elevate"
                        data-testid={`bug-card-${bug.id}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <SeverityIcon className={`h-4 w-4 ${severityColor}`} />
                              <h3 className="font-semibold" data-testid={`bug-title-${bug.id}`}>
                                {bug.title}
                              </h3>
                              <Badge variant={statusVariant} data-testid={`bug-status-${bug.id}`}>
                                {statusConfig[bug.status as keyof typeof statusConfig]?.label || bug.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {bug.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2" data-testid={`bug-description-${bug.id}`}>
                              {bug.description}
                            </p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Platform: {bug.platform}</span>
                              <span>Page: {bug.page || "N/A"}</span>
                              <span>Created: {new Date(bug.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {bug.status !== "resolved" && bug.status !== "closed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateBugMutation.mutate({
                                    id: bug.id,
                                    updates: { status: "resolved" },
                                  })
                                }
                                disabled={updateBugMutation.isPending}
                                className="flex-1 sm:flex-none"
                                data-testid={`button-resolve-${bug.id}`}
                              >
                                Resolve
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this bug report?")) {
                                  deleteBugMutation.mutate(bug.id);
                                }
                              }}
                              disabled={deleteBugMutation.isPending}
                              data-testid={`button-delete-${bug.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
