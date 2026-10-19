import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, CheckCircle, XCircle, Settings, Key, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { UpsellDialog } from "@/components/upsell-dialog";
import { LockedFeature } from "@/components/locked-feature";

const hubspotFormSchema = z.object({
  apiKey: z.string().min(1, "API key is required").regex(/^pat-/, "Must be a HubSpot Private App token starting with 'pat-'"),
});

type HubspotFormData = z.infer<typeof hubspotFormSchema>;

export default function HubSpotSettings() {
  const { toast } = useToast();
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  
  const {
    currentTier,
    hasFeatureAccess,
    requireFeature,
    upsellConfig,
    closeUpsell,
  } = useFeatureAccess();

  const hasCrmSync = hasFeatureAccess("crmSync");

  const { data: user, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const organizationId = user?.organization?.id;

  const { data: hubspotStatus, isLoading: statusLoading, error: statusError, isError: hubspotIsError, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["/api/organizations", organizationId, "hubspot", "status"],
    enabled: !!organizationId && hasCrmSync, // Prevent unauthorized API calls
  });

  const form = useForm<HubspotFormData>({
    resolver: zodResolver(hubspotFormSchema),
    defaultValues: {
      apiKey: "",
    },
  });

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

  const isLoading = userLoading || statusLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-hubspot-settings">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (hubspotIsError) return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">Failed to load data. Please refresh the page.</p>
      <Button variant="outline" size="sm" onClick={() => refetchStatus()}>Retry</Button>
    </div>
  );

  if (!user || (user.role !== "owner" && user.role !== "admin")) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl" data-testid="page-hubspot-settings-unauthorized">
        <Card>
          <CardHeader className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base">Access Denied</CardTitle>
                <CardDescription className="text-xs sm:text-sm">You need owner or admin privileges to manage HubSpot settings</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isConfigured = hubspotStatus?.configured || false;
  const isEnabled = hubspotStatus?.enabled || false;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl" data-testid="page-hubspot-settings">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2" data-testid="text-hubspot-settings-title">HubSpot Integration</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Configure your organization's HubSpot CRM integration</p>
      </div>

      {/* Status Card */}
      {!statusError && (
        <Card data-testid="card-hubspot-status">
        <CardHeader className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base">Integration Status</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Current status of your HubSpot connection</CardDescription>
            </div>
            {isConfigured && (
              <Badge 
                variant={isEnabled ? "default" : "secondary"}
                data-testid="badge-hubspot-status"
                className="shrink-0 text-xs"
              >
                {isEnabled ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1 shrink-0" />
                    Active
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1 shrink-0" />
                    Disabled
                  </>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 pt-0 sm:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Configuration</p>
              <p className="text-base sm:text-lg font-semibold" data-testid="text-config-status">
                {isConfigured ? "Configured" : "Not Configured"}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Connection</p>
              <p className="text-base sm:text-lg font-semibold" data-testid="text-connection-status">
                {isEnabled ? "Connected" : "Disconnected"}
              </p>
            </div>
          </div>

          {isConfigured && (
            <div className="flex flex-col sm:flex-row gap-2 pt-3 sm:pt-4 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || !isEnabled}
                className="w-full sm:w-auto text-xs sm:text-sm"
                data-testid="button-test-connection"
              >
                {testMutation.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                    Test Connection
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowDisableDialog(true)}
                className="w-full sm:w-auto text-xs sm:text-sm"
                data-testid="button-disable-integration"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                Disable Integration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Configuration Card */}
      <LockedFeature
        locked={!hasCrmSync}
        onClick={() => requireFeature("crmSync", {
          featureName: "HubSpot CRM Integration",
          featureDescription: "Connect your HubSpot CRM to automatically sync contacts, companies, and deals. Track sales pipeline, log activities, and maintain a single source of truth across your systems. Available on Enterprise plan.",
        })}
        tierBadgeText="Enterprise"
        variant="overlay"
        featureName="HubSpot CRM Integration"
      >
        <Card data-testid="card-hubspot-configuration">
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base">
              <div className="flex items-center gap-2 min-w-0">
                <Key className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                {isConfigured ? "Update API Key" : "Configure API Key"}
              </div>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
            {isConfigured 
              ? "Update your HubSpot Private App access token" 
              : "Enter your HubSpot Private App access token to enable CRM integration"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
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
                        className="text-primary hover:underline"
                        data-testid="button-toggle-api-key"
                      >
                        {showApiKey ? "Hide" : "Show"}
                      </button>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/50 border rounded-lg p-3 sm:p-4 space-y-2">
                <p className="text-xs sm:text-sm font-medium">How to get your API key:</p>
                <ol className="text-xs sm:text-sm text-muted-foreground list-decimal list-inside space-y-1">
                  <li>Go to HubSpot Settings → Integrations → Private Apps</li>
                  <li>Create a new Private App or select an existing one</li>
                  <li>Add the required scopes: contacts, companies, deals</li>
                  <li>Copy the access token (starts with "pat-")</li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  size="sm"
                  type="submit"
                  disabled={configureMutation.isPending}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                  data-testid="button-save-api-key"
                >
                  {configureMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
                      {isConfigured ? "Updating..." : "Configuring..."}
                    </>
                  ) : (
                    <>
                      <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                      {isConfigured ? "Update API Key" : "Save API Key"}
                    </>
                  )}
                </Button>
                {form.formState.isDirty && (
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    className="w-full sm:w-auto text-xs sm:text-sm"
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
      </LockedFeature>

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent data-testid="dialog-disable-confirm" className="p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Disable HubSpot Integration?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              This will disable the HubSpot integration for your organization. You can re-enable it later by configuring a new API key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-disable" className="text-xs sm:text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending}
              className="bg-destructive text-destructive-foreground text-xs sm:text-sm"
              data-testid="button-confirm-disable"
            >
              {disableMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
                  Disabling...
                </>
              ) : (
                "Disable"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upsell Dialog */}
      {upsellConfig && (
        <UpsellDialog
          open={true}
          onOpenChange={closeUpsell}
          featureName={upsellConfig.featureName}
          featureDescription={upsellConfig.featureDescription}
          requiredTier={upsellConfig.requiredTier}
          requiredAddon={upsellConfig.requiredAddon}
          currentTier={currentTier}
          type={upsellConfig.requiredTier ? "tier" : "addon"}
        />
      )}
    </div>
  );
}
