import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, CheckCircle2, Loader2, DollarSign, FileSignature, Mail } from "lucide-react";
import { 
  SiHubspot, 
  SiJira, 
  SiConfluence, 
  SiGooglecalendar, 
  SiGithub,
  SiQuickbooks
} from "react-icons/si";
import { ErrorState } from "@/components/error-state";
import { LockedFeature } from "@/components/locked-feature";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import type { ExternalServiceConnection } from "@shared/schema";

interface IntegrationStatus {
  connected: boolean;
  accountInfo?: {
    companyName?: string;
    realmId?: string;
    accountName?: string;
    email?: string;
  };
  lastSynced?: string;
}

const REPLIT_SERVICES = [
  {
    id: "jira",
    name: "Jira",
    description: "Manage issues and track project tasks",
    icon: SiJira,
    brandColor: "#0052CC",
    connectorId: "connector:ccfg_jira_8D0B4B1730F64429A4FC3ACB88",
    category: "productivity",
  },
  {
    id: "confluence",
    name: "Confluence",
    description: "Create and manage project documentation",
    icon: SiConfluence,
    brandColor: "#172B4D",
    connectorId: "connector:ccfg_confluence_38283C8EB5984810B6FBCFDCFB",
    category: "productivity",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Schedule site visits and meetings",
    icon: SiGooglecalendar,
    brandColor: "#4285F4",
    connectorId: "connector:ccfg_google-calendar_DDDBAC03DE404369B74F32E78D",
    category: "productivity",
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Manage emails and calendar events",
    icon: Mail,
    brandColor: "#0078D4",
    connectorId: "connector:ccfg_outlook_01K4BBCKRJKP82N3PYQPZQ6DAK",
    category: "productivity",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Export project data and track changes",
    icon: SiGithub,
    brandColor: "#181717",
    connectorId: "connector:ccfg_github_01K4B9XD3VRVD2F99YM91YTCAF",
    category: "productivity",
  },
];

const CUSTOM_INTEGRATIONS = [
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    description: "Export invoices and sync customer data",
    icon: SiQuickbooks,
    brandColor: "#2CA01C",
    category: "business",
  },
  {
    id: "docusign",
    name: "DocuSign",
    description: "Send quotes for electronic signature",
    icon: FileSignature,
    brandColor: "#FFD700",
    category: "business",
  },
];

const CRM_PAYMENT_INTEGRATIONS = [
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts and track deals with your CRM",
    icon: SiHubspot,
    brandColor: "#FF7A59",
    settingsUrl: "/hubspot-settings",
    category: "crm",
  },
];

export default function Integrations() {
  const { toast } = useToast();
  const { hasFeatureAccess, requireFeature } = useFeatureAccess();
  
  const hasCrmSync = hasFeatureAccess("crmSync");

  const { 
    data: connections = [], 
    isLoading: connectionsLoading,
    isError: connectionsError,
    error: connectionsErrorObj,
    refetch: refetchConnections
  } = useQuery<ExternalServiceConnection[]>({
    queryKey: ["/api/integrations/connections"],
  });

  const {
    data: quickbooksStatus,
    isLoading: quickbooksLoading,
    refetch: refetchQuickBooks
  } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/quickbooks/status"],
    enabled: hasCrmSync, // Prevent unauthorized API calls
  });

  const {
    data: docusignStatus,
    isLoading: docusignLoading,
    refetch: refetchDocuSign
  } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/docusign/status"],
    enabled: hasCrmSync, // Prevent unauthorized API calls
  });

  const isLoading = connectionsLoading || quickbooksLoading || docusignLoading;
  const isError = connectionsError;

  const connectMutation = useMutation({
    mutationFn: async (service: string) => {
      const res = await apiRequest("POST", "/api/integrations/connect", { service });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to initiate connection");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/connections"] });
      toast({
        title: "Integration setup initiated",
        description: "Complete the OAuth flow in the popup window to connect your account",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        title: "Failed to connect integration",
        description: errorMessage.includes("OAuth") || errorMessage.includes("authentication")
          ? "Authentication failed. Please try again and ensure you grant all required permissions"
          : errorMessage.includes("already connected") || errorMessage.includes("existing")
          ? "This service is already connected to your account"
          : errorMessage || "Unable to initiate connection. Please try again",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const res = await apiRequest("DELETE", `/api/integrations/connections/${connectionId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to disconnect service");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/connections"] });
      toast({
        title: "Integration disconnected",
        description: "Service has been successfully disconnected from your account",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        title: "Failed to disconnect",
        description: errorMessage || "Unable to disconnect service. Please try again",
      });
    },
  });

  const connectQuickBooksMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/quickbooks/connect");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to initiate QuickBooks connection");
      }
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      window.open(data.authUrl, "_blank", "width=600,height=700");
      toast({
        title: "QuickBooks OAuth initiated",
        description: "Complete the authorization in the popup window",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to connect QuickBooks",
        description: error.message || "Unable to initiate connection",
      });
    },
  });

  const disconnectQuickBooksMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/quickbooks/disconnect");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to disconnect QuickBooks");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/quickbooks/status"] });
      refetchQuickBooks();
      toast({
        title: "QuickBooks disconnected",
        description: "Successfully disconnected from QuickBooks",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to disconnect",
        description: error.message,
      });
    },
  });

  const connectDocuSignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/docusign/connect");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to initiate DocuSign connection");
      }
      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      window.open(data.authUrl, "_blank", "width=600,height=700");
      toast({
        title: "DocuSign OAuth initiated",
        description: "Complete the authorization in the popup window",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to connect DocuSign",
        description: error.message || "Unable to initiate connection",
      });
    },
  });

  const disconnectDocuSignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/docusign/disconnect");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to disconnect DocuSign");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/docusign/status"] });
      refetchDocuSign();
      toast({
        title: "DocuSign disconnected",
        description: "Successfully disconnected from DocuSign",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to disconnect",
        description: error.message,
      });
    },
  });

  const getConnectionStatus = (serviceId: string) => {
    return connections.find((c) => c.service === serviceId);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <ErrorState
            title="Failed to load integrations"
            message={connectionsErrorObj instanceof Error ? connectionsErrorObj.message : "Unable to fetch integration connections"}
            error={connectionsErrorObj as Error}
            onRetry={refetchConnections}
            testId="error-integrations"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2" data-testid="text-integrations-title">Integrations</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Connect external services to streamline your workflow and enhance collaboration.
          </p>
        </div>

        <LockedFeature
          locked={!hasCrmSync}
          onClick={() => requireFeature("crmSync", {
            featureName: "Business Integrations",
            featureDescription: "Connect QuickBooks and DocuSign to streamline invoicing and quote approvals. Export projects to QuickBooks, send quotes for e-signature, and eliminate manual data entry. Available on Enterprise plan.",
          })}
          tierBadgeText="Enterprise"
          variant="overlay"
          featureName="Business Integrations"
        >
          <div>
            <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4">Business Integrations</h2>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <Card data-testid="card-integration-quickbooks">
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2 rounded-lg shrink-0" style={{ backgroundColor: "rgba(44, 160, 28, 0.1)" }}>
                      <SiQuickbooks className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: "#2CA01C" }} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg">QuickBooks Online</CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm">
                        Export invoices and sync customer data
                      </CardDescription>
                    </div>
                  </div>
                  {quickbooksStatus?.connected ? (
                    <Badge variant="default" className="gap-1 shrink-0 text-xs" data-testid="badge-status-quickbooks">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span className="hidden sm:inline">Connected</span>
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 shrink-0 text-xs" data-testid="badge-status-quickbooks">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span className="hidden sm:inline">Not Connected</span>
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                {quickbooksStatus?.connected ? (
                  <div className="space-y-2 sm:space-y-3">
                    {quickbooksStatus.accountInfo?.companyName && (
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Company: {quickbooksStatus.accountInfo.companyName}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectQuickBooksMutation.mutate()}
                      disabled={disconnectQuickBooksMutation.isPending}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                      data-testid="button-disconnect-quickbooks"
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => connectQuickBooksMutation.mutate()}
                    disabled={connectQuickBooksMutation.isPending}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                    data-testid="button-connect-quickbooks"
                  >
                    Connect QuickBooks
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-integration-docusign">
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2 rounded-lg shrink-0" style={{ backgroundColor: "rgba(255, 215, 0, 0.15)" }}>
                      <FileSignature className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: "#C4A000" }} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg">DocuSign</CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm">
                        Send quotes for electronic signature
                      </CardDescription>
                    </div>
                  </div>
                  {docusignStatus?.connected ? (
                    <Badge variant="default" className="gap-1 shrink-0 text-xs" data-testid="badge-status-docusign">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span className="hidden sm:inline">Connected</span>
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 shrink-0 text-xs" data-testid="badge-status-docusign">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span className="hidden sm:inline">Not Connected</span>
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                {docusignStatus?.connected ? (
                  <div className="space-y-2 sm:space-y-3">
                    {docusignStatus.accountInfo?.email && (
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Account: {docusignStatus.accountInfo.email}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectDocuSignMutation.mutate()}
                      disabled={disconnectDocuSignMutation.isPending}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                      data-testid="button-disconnect-docusign"
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => connectDocuSignMutation.mutate()}
                    disabled={connectDocuSignMutation.isPending}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                    data-testid="button-connect-docusign"
                  >
                    Connect DocuSign
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        </LockedFeature>

        <div>
          <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4">CRM & Payments</h2>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            {CRM_PAYMENT_INTEGRATIONS.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card key={integration.id} data-testid={`card-integration-${integration.id}`}>
                  <CardHeader className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                        <div 
                          className="p-1.5 sm:p-2 rounded-lg shrink-0"
                          style={{ backgroundColor: `${integration.brandColor}15` }}
                        >
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: integration.brandColor }} />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base sm:text-lg">{integration.name}</CardTitle>
                          <CardDescription className="mt-1 text-xs sm:text-sm">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                    <Link href={integration.settingsUrl} data-testid={`link-configure-${integration.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto text-xs sm:text-sm"
                        data-testid={`button-configure-${integration.id}`}
                      >
                        Configure
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-base sm:text-xl font-semibold mb-3 sm:mb-4">Productivity Integrations</h2>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {REPLIT_SERVICES.map((service) => {
              const connection = getConnectionStatus(service.id);
              const isConnected = !!connection;
              const Icon = service.icon;

              return (
                <Card key={service.id} data-testid={`card-integration-${service.id}`}>
                  <CardHeader className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
                        <div 
                          className="p-1.5 sm:p-2 rounded-lg shrink-0"
                          style={{ backgroundColor: `${service.brandColor}15` }}
                        >
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: service.brandColor }} />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-base sm:text-lg">{service.name}</CardTitle>
                          <CardDescription className="mt-1 text-xs sm:text-sm">
                            {service.description}
                          </CardDescription>
                        </div>
                      </div>
                      {isConnected ? (
                        <Badge variant="default" className="gap-1 shrink-0 text-xs" data-testid={`badge-status-${service.id}`}>
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          <span className="hidden sm:inline">Connected</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 shrink-0 text-xs" data-testid={`badge-status-${service.id}`}>
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span className="hidden sm:inline">Not Connected</span>
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                    {isConnected ? (
                      <div className="space-y-2 sm:space-y-3">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          Connected on {new Date(connection.createdAt).toLocaleDateString()}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => disconnectMutation.mutate(connection.id)}
                          disabled={disconnectMutation.isPending}
                          className="w-full sm:w-auto text-xs sm:text-sm"
                          data-testid={`button-disconnect-${service.id}`}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => connectMutation.mutate(service.id)}
                        disabled={connectMutation.isPending}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                        data-testid={`button-connect-${service.id}`}
                      >
                        Connect {service.name}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="mt-4 sm:mt-8">
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-base sm:text-lg">Integration Features</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              What you can do with these integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="font-semibold text-sm sm:text-base">QuickBooks Integration</h3>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Export project estimates as invoices</li>
                  <li>Automatically create customer records</li>
                  <li>Sync project data with accounting</li>
                  <li>Eliminate manual data entry</li>
                </ul>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="font-semibold text-sm sm:text-base">DocuSign Integration</h3>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Send quotes for electronic signature</li>
                  <li>Track signature status in real-time</li>
                  <li>Speed up quote approval by 60%</li>
                  <li>Legally binding e-signatures</li>
                </ul>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="font-semibold text-sm sm:text-base">Jira Integration</h3>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Create issues from survey projects</li>
                  <li>Track project progress in Jira</li>
                  <li>Link survey openings to Jira tasks</li>
                </ul>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="font-semibold text-sm sm:text-base">Confluence Integration</h3>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Generate project documentation pages</li>
                  <li>Export survey reports to Confluence</li>
                  <li>Share specifications with stakeholders</li>
                </ul>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="font-semibold text-sm sm:text-base">Google Calendar / Outlook</h3>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Schedule site visit appointments</li>
                  <li>Send meeting invites to team members</li>
                  <li>Track project milestones</li>
                </ul>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="font-semibold text-sm sm:text-base">GitHub Integration</h3>
                <ul className="text-xs sm:text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Export project data as JSON/CSV</li>
                  <li>Version control for specifications</li>
                  <li>Backup survey data automatically</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
