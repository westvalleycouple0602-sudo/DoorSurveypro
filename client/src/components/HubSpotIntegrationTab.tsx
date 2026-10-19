import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Building2,
  TrendingUp,
  ExternalLink,
  Loader2,
  Key,
  Trash2,
  Lock,
} from "lucide-react";

const hubspotFormSchema = z.object({
  apiKey: z.string().min(1, "API key is required").regex(/^pat-/, "Must be a HubSpot Private App token starting with 'pat-'"),
});

type HubspotFormData = z.infer<typeof hubspotFormSchema>;

interface HubSpotIntegrationTabProps {
  organizationId: string;
  userRole: string;
  subscriptionTier?: string;
}

export function HubSpotIntegrationTab({ organizationId, userRole, subscriptionTier = "free" }: HubSpotIntegrationTabProps) {
  const { toast } = useToast();
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);

  const isAdminOrOwner = userRole === "owner" || userRole === "admin";
  const hasHubSpotAccess = subscriptionTier === "enterprise" || subscriptionTier === "master" || subscriptionTier === "professional";

  // Fetch HubSpot status
  const { data: hubspotStatus, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["/api/organizations", organizationId, "hubspot", "status"],
    enabled: !!organizationId && hasHubSpotAccess,
  });

  const form = useForm<HubspotFormData>({
    resolver: zodResolver(hubspotFormSchema),
    defaultValues: {
      apiKey: "",
    },
  });

  // Configure HubSpot API key
  const configureMutation = useMutation({
    mutationFn: async (data: HubspotFormData) => {
      const res = await apiRequest("POST", `/api/organizations/${organizationId}/hubspot/configure`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", organizationId, "hubspot", "status"] });
      form.reset();
      setShowApiKey(false);
      toast({
        title: "HubSpot Configured",
        description: "Your HubSpot integration has been configured successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to configure HubSpot integration",
        variant: "destructive",
      });
    },
  });

  // Test connection
  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/organizations/${organizationId}/hubspot/test`, {});
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Successful",
        description: data.message || "HubSpot connection is working properly",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to HubSpot",
        variant: "destructive",
      });
    },
  });

  // Disable integration
  const disableMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/organizations/${organizationId}/hubspot/disable`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", organizationId, "hubspot", "status"] });
      setShowDisableDialog(false);
      toast({
        title: "HubSpot Disabled",
        description: "HubSpot integration has been disabled",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Disable Failed",
        description: error.message || "Failed to disable HubSpot integration",
        variant: "destructive",
      });
    },
  });

  // Sync all customers
  const syncAllCustomersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hubspot/sync/all-customers");
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Bulk sync failed");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setSyncResults(data);
      toast({
        title: "Customer sync complete",
        description: `Successfully synced ${data.synced} customers${data.failed > 0 ? `, ${data.failed} failed` : ""}`,
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Customer sync failed",
        description: errorMessage.includes("authentication") || errorMessage.includes("unauthorized")
          ? "HubSpot authentication failed. Please check your API key and permissions"
          : errorMessage.includes("rate") || errorMessage.includes("limit")
          ? "HubSpot API rate limit reached. Please try again later"
          : errorMessage || "Unable to sync customers to HubSpot. Please try again",
        variant: "destructive",
      });
    },
  });

  const isConfigured = hubspotStatus?.configured || false;
  const isEnabled = hubspotStatus?.enabled || false;
  const isSyncing = syncAllCustomersMutation.isPending;

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="loading-hubspot">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show upgrade prompt for users without HubSpot access
  if (!hasHubSpotAccess) {
    return (
      <div className="space-y-4 sm:space-y-6" data-testid="hubspot-upgrade-prompt">
        <div>
          <h2 className="text-2xl font-bold">HubSpot CRM Integration</h2>
          <p className="text-muted-foreground mt-2">
            Sync your customers to HubSpot CRM as companies
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Upgrade Required
            </CardTitle>
            <CardDescription>
              HubSpot CRM integration is available on Professional, Enterprise, and Master plans
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="mb-3">Unlock powerful CRM features:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
                <li>Automatic customer sync to HubSpot as companies</li>
                <li>Bi-directional data synchronization</li>
                <li>Contact information and location data sync</li>
                <li>Project linking as HubSpot deals</li>
                <li>Manufacturer contact sync</li>
              </ul>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Current plan: <Badge variant="secondary">{subscriptionTier === "free" ? "Free" : subscriptionTier === "starter" ? "Starter" : subscriptionTier}</Badge>
              </p>
              <Button asChild>
                <Link href="/billing">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Upgrade to Professional
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6" data-testid="hubspot-integration-tab">
      <div>
        <h2 className="text-2xl font-bold" data-testid="heading-hubspot-integration">HubSpot CRM Integration</h2>
        <p className="text-muted-foreground mt-2">
          Sync your customers to HubSpot CRM as companies
        </p>
      </div>

      {/* Error State */}
      {statusError && (
        <Card className="border-destructive" data-testid="card-status-error">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-destructive" />
              <div>
                <CardTitle>Error Loading Status</CardTitle>
                <CardDescription>Failed to fetch HubSpot integration status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => refetchStatus()}
              className="w-full sm:w-auto"
              data-testid="button-retry-status"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connection Status Card */}
      {!statusError && (
        <Card data-testid="card-hubspot-status">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {statusLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : isConfigured ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  Connection Status
                </CardTitle>
                <CardDescription>
                  {statusLoading 
                    ? "Checking configuration..." 
                    : hubspotStatus?.message || "Current status of your HubSpot connection"}
                </CardDescription>
              </div>
              {isConfigured && (
                <Badge 
                  variant={isEnabled ? "default" : "secondary"}
                  data-testid="badge-hubspot-status"
                >
                  {isEnabled ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3 mr-1" />
                      Disabled
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConfigured && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">HubSpot API key not configured</p>
                    {!isAdminOrOwner ? (
                      <p className="text-sm">
                        Please contact your organization owner or administrator to configure the HubSpot integration.
                      </p>
                    ) : (
                      <>
                        <p className="text-sm">
                          To enable HubSpot integration:
                        </p>
                        <ol className="text-sm list-decimal list-inside space-y-1 ml-2">
                          <li>Go to HubSpot → Settings → Integrations → Private Apps</li>
                          <li>Create a new private app with CRM permissions (contacts, companies)</li>
                          <li>Copy the access token</li>
                          <li>Configure it below using the API key form</li>
                        </ol>
                        <p className="text-sm mt-2">
                          <a 
                            href="https://developers.hubspot.com/docs/api/private-apps"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:underline inline-flex items-center gap-1"
                          >
                            View HubSpot Documentation
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </p>
                      </>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {isConfigured && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending || !isEnabled || !isAdminOrOwner}
                  className="w-full sm:w-auto"
                  data-testid="button-test-connection"
                >
                  {testMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
                {isAdminOrOwner && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDisableDialog(true)}
                    className="w-full sm:w-auto"
                    data-testid="button-disable-integration"
                  >
                    <Trash2 className="w-4 w-4 mr-2" />
                    Disable Integration
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* API Key Configuration Card (Only for Admins/Owners) */}
      {isAdminOrOwner && (
        <Card data-testid="card-hubspot-configuration">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                {isConfigured ? "Update API Key" : "Configure API Key"}
              </div>
            </CardTitle>
            <CardDescription>
              {isConfigured 
                ? "Update your HubSpot Private App access token" 
                : "Enter your HubSpot Private App access token to enable CRM integration"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => configureMutation.mutate(data))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Private App Access Token</FormLabel>
                      <FormControl>
                        <Input
                          type={showApiKey ? "text" : "password"}
                          placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          {...field}
                          data-testid="input-hubspot-api-key"
                        />
                      </FormControl>
                      <FormDescription>
                        Your HubSpot Private App token (starts with "pat-").{" "}
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-muted-foreground hover:underline"
                          data-testid="button-toggle-api-key"
                        >
                          {showApiKey ? "Hide" : "Show"}
                        </button>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="submit"
                    disabled={configureMutation.isPending}
                    className="w-full sm:w-auto"
                    data-testid="button-save-api-key"
                  >
                    {configureMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isConfigured ? "Updating..." : "Configuring..."}
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        {isConfigured ? "Update API Key" : "Save API Key"}
                      </>
                    )}
                  </Button>
                  {form.formState.isDirty && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                      className="w-full sm:w-auto"
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Sync Customers Card */}
      {isConfigured && isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Sync Customers as Companies
            </CardTitle>
            <CardDescription>
              Push all customers to HubSpot as companies with location data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Customers will be synced with:
              <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                <li>Customer name and type</li>
                <li>Primary location address</li>
                <li>Contact information</li>
                <li>Unique customer ID for tracking</li>
              </ul>
            </div>
            <Button
              onClick={() => syncAllCustomersMutation.mutate()}
              disabled={isSyncing}
              className="w-full sm:w-auto"
              data-testid="button-sync-all-customers"
            >
              {isSyncing && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sync All Customers
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sync Results */}
      {syncResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sync Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-md">
                <div className="text-3xl font-bold text-green-600">
                  {syncResults.synced}
                </div>
                <div className="text-sm text-muted-foreground">Successfully Synced</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-md">
                <div className="text-3xl font-bold text-red-600">
                  {syncResults.failed}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {syncResults.results && syncResults.results.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Successfully Synced:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {syncResults.results.map((result: any, index: number) => (
                    <div key={index} className="text-sm flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>{result.customerName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {syncResults.errors && syncResults.errors.length > 0 && (
              <div>
                <Separator className="my-4" />
                <h4 className="font-medium mb-2 text-red-600">Errors:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {syncResults.errors.map((error: any, index: number) => (
                    <div key={index} className="text-sm p-2 bg-red-50 dark:bg-red-950 rounded">
                      <div className="font-medium flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        {error.customerName}
                      </div>
                      <div className="text-muted-foreground ml-6">{error.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setSyncResults(null)}
              className="w-full sm:w-auto mt-4"
            >
              Clear Results
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Permission Notice for non-admins */}
      {!isAdminOrOwner && !isConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Access Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Only organization owners and administrators can configure the HubSpot integration.
              Please contact your administrator to set up this feature.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent data-testid="dialog-disable-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Disable HubSpot Integration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable the HubSpot integration for your organization. You can re-enable it later by configuring a new API key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-disable">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-disable"
            >
              {disableMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
