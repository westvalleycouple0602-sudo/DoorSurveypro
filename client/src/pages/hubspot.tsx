import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ErrorState } from "@/components/error-state";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Paywall } from "@/components/paywall";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Building2,
  Users,
  TrendingUp,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function HubSpot() {
  const { toast } = useToast();
  const { hasFeatureAccess, currentTier } = useFeatureAccess();
  const [syncResults, setSyncResults] = useState<any>(null);

  // Check if user has access to CRM Sync (crmSync feature, Enterprise only)
  const hasAccess = hasFeatureAccess("crmSync");

  // Check HubSpot configuration status (only when user has access)
  const { 
    data: status, 
    isLoading: statusLoading,
    isError,
    error: errorObj,
    refetch
  } = useQuery({
    queryKey: ["/api/hubspot/status"],
    enabled: hasAccess,
    refetchOnWindowFocus: hasAccess,
  });

  // Sync individual project
  const syncProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiRequest("POST", `/api/hubspot/sync/project/${projectId}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Sync failed");
      }
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Project synced successfully",
        description: "Project has been synced to HubSpot CRM",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to sync project",
        description: errorMessage.includes("authentication") || errorMessage.includes("unauthorized")
          ? "HubSpot authentication failed. Please check your API key"
          : errorMessage.includes("API") || errorMessage.includes("HubSpot")
          ? "HubSpot API error. Please try again later"
          : errorMessage || "Unable to sync project. Please check your HubSpot configuration",
        variant: "destructive",
      });
    },
  });

  // Sync all projects
  const syncAllProjectsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hubspot/sync/all-projects");
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Bulk sync failed");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setSyncResults(data);
      toast({
        title: "Bulk sync complete",
        description: `Successfully synced ${data.synced} projects${data.failed > 0 ? `, ${data.failed} failed` : ""}`,
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Bulk sync failed",
        description: errorMessage.includes("authentication") || errorMessage.includes("unauthorized")
          ? "HubSpot authentication failed. Please check your API key and permissions"
          : errorMessage.includes("rate") || errorMessage.includes("limit")
          ? "HubSpot API rate limit reached. Please try again later"
          : errorMessage || "Unable to sync projects to HubSpot. Please try again",
        variant: "destructive",
      });
    },
  });

  // Sync all manufacturers
  const syncAllManufacturersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/hubspot/sync/all-manufacturers");
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Bulk sync failed");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setSyncResults(data);
      toast({
        title: "Manufacturer sync complete",
        description: `Successfully synced ${data.synced} manufacturers${data.failed > 0 ? `, ${data.failed} failed` : ""}`,
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Manufacturer sync failed",
        description: errorMessage.includes("authentication") || errorMessage.includes("unauthorized")
          ? "HubSpot authentication failed. Please check your API key and permissions"
          : errorMessage.includes("rate") || errorMessage.includes("limit")
          ? "HubSpot API rate limit reached. Please try again later"
          : errorMessage || "Unable to sync manufacturers to HubSpot. Please try again",
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

  const isConfigured = (status as any)?.configured === true;
  const isSyncing = 
    syncAllProjectsMutation.isPending || 
    syncAllManufacturersMutation.isPending ||
    syncAllCustomersMutation.isPending;

  // Show paywall if user doesn't have access (check is done before queries)
  if (!hasAccess) {
    return (
      <Paywall
        variant="fullPage"
        featureName="HubSpot CRM Integration"
        featureDescription="Connect your HubSpot CRM to automatically sync projects, contacts, companies, and deals. Track sales pipeline, log activities, and maintain a single source of truth across your systems."
        requiredTier="enterprise"
        currentTier={currentTier}
        type="tier"
      />
    );
  }

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-hubspot">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load HubSpot status"
          message={errorObj instanceof Error ? errorObj.message : "Unable to check HubSpot configuration"}
          error={errorObj as Error}
          onRetry={refetch}
          testId="error-hubspot-status"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="page-hubspot">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="heading-hubspot">HubSpot CRM Integration</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-xs sm:text-sm">
          Sync your projects, contacts, and deals with HubSpot CRM
        </p>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            {statusLoading ? (
              <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin shrink-0" />
            ) : isConfigured ? (
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 shrink-0" />
            )}
            Configuration Status
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {statusLoading 
              ? "Checking configuration..." 
              : (status as any)?.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
          {!isConfigured && (
            <Alert>
              <AlertCircle className="h-4 w-4 shrink-0" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">HubSpot API key not configured</p>
                  <p className="text-sm">
                    To enable HubSpot integration:
                  </p>
                  <ol className="text-sm list-decimal list-inside space-y-1 ml-2">
                    <li>Go to HubSpot → Settings → Integrations → Private Apps</li>
                    <li>Create a new private app with CRM permissions (contacts, deals, notes)</li>
                    <li>Copy the access token</li>
                    <li>Add it as <code className="bg-muted px-1 rounded">HUBSPOT_API_KEY</code> in your workspace Secrets</li>
                    <li>Restart the application</li>
                  </ol>
                  <p className="text-xs sm:text-sm mt-2">
                    <a 
                      href="https://developers.hubspot.com/docs/api/private-apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View HubSpot Documentation
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isConfigured && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="default" className="bg-green-600 shrink-0 text-xs">Connected</Badge>
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Ready to sync data to HubSpot CRM
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Sync Projects as Deals
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Push all projects to HubSpot as deals with project costs and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Projects will be synced with:
              <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                <li>Project name and building as deal name</li>
                <li>Total project cost as deal amount</li>
                <li>Project status mapped to deal stage</li>
                <li>Unique project ID for tracking</li>
              </ul>
            </div>
            <Button
              size="sm"
              onClick={() => syncAllProjectsMutation.mutate()}
              disabled={!isConfigured || isSyncing}
              className="w-full sm:w-auto text-xs sm:text-sm"
              data-testid="button-sync-all-projects"
            >
              {syncAllProjectsMutation.isPending && (
                <RefreshCw className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin shrink-0" />
              )}
              Sync All Projects
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Sync Customers as Companies
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Push all customers to HubSpot as companies with location data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Customers will be synced with:
              <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                <li>Customer name and type</li>
                <li>Primary location address</li>
                <li>Contact information</li>
                <li>Projects automatically linked as deals</li>
              </ul>
            </div>
            <Button
              size="sm"
              onClick={() => syncAllCustomersMutation.mutate()}
              disabled={!isConfigured || isSyncing}
              className="w-full sm:w-auto text-xs sm:text-sm"
              data-testid="button-sync-all-customers"
            >
              {syncAllCustomersMutation.isPending && (
                <RefreshCw className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin shrink-0" />
              )}
              Sync All Customers
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Sync Manufacturer Contacts
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Push all manufacturer contacts to HubSpot CRM
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Manufacturers will be synced with:
              <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
                <li>Contact name (first and last)</li>
                <li>Company name</li>
                <li>Email address (required)</li>
                <li>Phone number</li>
              </ul>
            </div>
            <Button
              size="sm"
              onClick={() => syncAllManufacturersMutation.mutate()}
              disabled={!isConfigured || isSyncing}
              className="w-full sm:w-auto text-xs sm:text-sm"
              data-testid="button-sync-all-manufacturers"
            >
              {syncAllManufacturersMutation.isPending && (
                <RefreshCw className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin shrink-0" />
              )}
              Sync All Manufacturers
            </Button>
          </CardContent>
        </Card>
      </div>

      {syncResults && (
        <Card>
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Sync Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-950 rounded-md">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">
                  {syncResults.synced}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Successfully Synced</div>
              </div>
              <div className="text-center p-3 sm:p-4 bg-red-50 dark:bg-red-950 rounded-md">
                <div className="text-2xl sm:text-3xl font-bold text-red-600">
                  {syncResults.failed}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {syncResults.results && syncResults.results.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-sm sm:text-base">Successfully Synced:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {syncResults.results.map((result: any, index: number) => (
                    <div key={index} className="text-xs sm:text-sm flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0" />
                      <span className="truncate">{result.projectName || result.manufacturerName || result.customerName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {syncResults.errors && syncResults.errors.length > 0 && (
              <div>
                <Separator className="my-3 sm:my-4" />
                <h4 className="font-medium mb-2 text-red-600 text-sm sm:text-base">Errors:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {syncResults.errors.map((error: any, index: number) => (
                    <div key={index} className="text-xs sm:text-sm p-2 bg-red-50 dark:bg-red-950 rounded">
                      <div className="font-medium flex items-center gap-2 min-w-0">
                        <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 shrink-0" />
                        <span className="truncate">{error.projectName || error.manufacturerName || error.customerName}</span>
                      </div>
                      <div className="text-muted-foreground ml-5 sm:ml-6 break-words">{error.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setSyncResults(null)}
              className="w-full sm:w-auto mt-3 sm:mt-4 text-xs sm:text-sm"
            >
              Clear Results
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base">About HubSpot Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 text-xs sm:text-sm p-3 sm:p-4 pt-0 sm:pt-0">
          <div>
            <h4 className="font-medium mb-2">What gets synced?</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li><strong>Projects</strong> → HubSpot Deals (with total costs and status)</li>
              <li><strong>Customers</strong> → HubSpot Companies (with locations and contact info)</li>
              <li><strong>Manufacturer Contacts</strong> → HubSpot Contacts</li>
              <li><strong>Quote Requests</strong> → HubSpot Notes (associated with deals)</li>
            </ul>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-2">Deal Stage Mapping</h4>
            <div className="space-y-1 text-muted-foreground ml-2">
              <div>• Planning → Qualified to Buy</div>
              <div>• Active → Presentation Scheduled</div>
              <div>• Completed → Closed Won</div>
              <div>• On Hold → Decision Maker Bought In</div>
            </div>
          </div>
          <Separator />
          <div>
            <h4 className="font-medium mb-2">Duplicate Handling</h4>
            <p className="text-muted-foreground">
              The integration automatically checks for existing records using unique IDs
              (project IDs for deals, customer IDs for companies, email addresses for contacts),
              preventing duplicates and ensuring data consistency.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
