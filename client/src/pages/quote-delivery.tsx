import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ErrorState } from "@/components/error-state";
import {
  ArrowLeft,
  Send,
  Mail,
  FileText,
  PenTool,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  Loader2,
  DollarSign,
  Users,
  Building2,
  CalendarDays,
  Activity,
} from "lucide-react";

interface Quote {
  id: string;
  quoteNumber: string;
  version: number;
  status: string;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  currency: string;
  expiresAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  introduction?: string;
  sentAt?: string;
  sentVia?: string;
  viewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface QuoteDeliveryEvent {
  id: string;
  eventType: string;
  channel: string;
  recipientEmail?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  failedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface QuoteApproval {
  id: string;
  decision: string;
  method: string;
  approverEmail?: string;
  approverName?: string;
  comments?: string;
  signedAt: string;
}

interface Project {
  id: string;
  name: string;
  customerName?: string;
  status: string;
}

interface PortalShare {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  draft: { label: "Draft", variant: "outline", icon: FileText },
  sent: { label: "Sent", variant: "secondary", icon: Send },
  viewed: { label: "Viewed", variant: "default", icon: Eye },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  rejected: { label: "Declined", variant: "destructive", icon: XCircle },
  expired: { label: "Expired", variant: "outline", icon: AlertCircle },
};

const eventTypeLabels: Record<string, string> = {
  sent: "Sent",
  delivered: "Delivered",
  opened: "Opened",
  clicked: "Clicked",
  bounced: "Bounced",
  failed: "Failed",
};

function formatCurrency(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

interface ProjectWithQuotes extends Project {
  quoteCount?: number;
  pendingQuotes?: number;
  approvedQuotes?: number;
  totalValue?: number;
}

function ProjectListView() {
  const { data: projects, isLoading, error, refetch } = useQuery<ProjectWithQuotes[]>({
    queryKey: ["/api/projects"],
  });

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4">
        <Skeleton className="h-6 sm:h-8 w-48 sm:w-64 mb-4 sm:mb-6" />
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-6xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4">
        <ErrorState
          title="Unable to Load Projects"
          message="We couldn't load your projects. Please try again."
          onRetry={() => refetch()}
          testId="error-projects"
        />
      </div>
    );
  }

  const activeProjects = projects?.filter(p => p.status !== "completed" && p.status !== "cancelled") || [];

  return (
    <div className="container max-w-6xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-page-title">Quote Delivery</h1>
        <p className="text-sm text-muted-foreground mt-1">Select a project to manage quotes and deliveries</p>
      </div>

      {activeProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Projects</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create a project first to start generating and delivering quotes to your customers.
            </p>
            <Link href="/projects">
              <Button className="mt-4" data-testid="button-go-to-projects">
                <Plus className="h-4 w-4 mr-2" />
                Go to Projects
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activeProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}/quote-delivery`}>
              <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-project-${project.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg truncate">{project.name}</CardTitle>
                  {project.customerName && (
                    <CardDescription className="truncate flex items-center gap-1">
                      <Building2 className="h-3 w-3 shrink-0" />
                      {project.customerName}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="outline" className="text-xs">
                      {project.status}
                    </Badge>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Send className="h-3 w-3" />
                      Manage Quotes
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectQuoteDelivery({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendMethod, setSendMethod] = useState<"email" | "portal" | "docusign">("email");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: quotes, isLoading: quotesLoading, error: quotesError, refetch: refetchQuotes } = useQuery<Quote[]>({
    queryKey: [`/api/projects/${projectId}/quotes`],
  });

  const { data: deliveryEvents } = useQuery<QuoteDeliveryEvent[]>({
    queryKey: [`/api/quotes/${selectedQuote?.id}/delivery-events`],
    enabled: !!selectedQuote?.id,
  });

  const { data: approvals } = useQuery<QuoteApproval[]>({
    queryKey: [`/api/quotes/${selectedQuote?.id}/approvals`],
    enabled: !!selectedQuote?.id,
  });

  const { data: portalShares } = useQuery<PortalShare[]>({
    queryKey: [`/api/portal-shares/project/${projectId}`],
  });

  const createDraftMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/projects/${projectId}/quotes`, {});
    },
    onSuccess: async (response) => {
      const newQuote = await response.json();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/quotes`] });
      setSelectedQuote(newQuote);
      toast({
        title: "Quote Created",
        description: `Quote #${newQuote.quoteNumber} has been created as a draft.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create quote",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const sendQuoteMutation = useMutation({
    mutationFn: async (data: { quoteId: string; method: string; recipientEmail?: string; personalMessage?: string }) => {
      return apiRequest("POST", `/api/quotes/${data.quoteId}/send`, {
        method: data.method,
        recipientEmail: data.recipientEmail,
        personalMessage: data.personalMessage,
      });
    },
    onSuccess: async () => {
      setShowSendDialog(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/quotes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${selectedQuote?.id}/delivery-events`] });
      toast({
        title: "Quote Sent",
        description: `The quote has been sent via ${sendMethod}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send quote",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const duplicateQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return apiRequest("POST", `/api/quotes/${quoteId}/duplicate`, {});
    },
    onSuccess: async (response) => {
      const newQuote = await response.json();
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/quotes`] });
      setSelectedQuote(newQuote);
      toast({
        title: "Quote Duplicated",
        description: `New version created: Quote #${newQuote.quoteNumber}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to duplicate quote",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleSendQuote = () => {
    if (!selectedQuote) return;
    
    if (sendMethod === "email" && !recipientEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a recipient email address.",
        variant: "destructive",
      });
      return;
    }

    sendQuoteMutation.mutate({
      quoteId: selectedQuote.id,
      method: sendMethod,
      recipientEmail: sendMethod === "email" ? recipientEmail : undefined,
      personalMessage: personalMessage || undefined,
    });
  };

  const openSendDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setRecipientEmail(quote.customerEmail || "");
    setPersonalMessage("");
    setSendMethod("email");
    setShowSendDialog(true);
  };

  if (projectLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4">
        <Skeleton className="h-6 sm:h-8 w-48 sm:w-64 mb-4 sm:mb-6" />
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
          <Skeleton className="h-64 sm:h-96" />
          <Skeleton className="h-64 sm:h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container max-w-6xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4">
        <ErrorState
          title="Project Not Found"
          message="The project you're looking for doesn't exist or you don't have access."
        />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4">
      <div className="flex items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="icon" aria-label="Back to project" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate" data-testid="text-page-title">Quote Delivery</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{project.name}</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => createDraftMutation.mutate()}
          disabled={createDraftMutation.isPending}
          className="shrink-0 text-xs sm:text-sm"
          data-testid="button-create-quote"
        >
          {createDraftMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
          ) : (
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
          )}
          <span className="hidden sm:inline">New Quote</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="flex items-center justify-between gap-2 text-sm sm:text-base">
              <span>Quotes</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetchQuotes()}
                aria-label="Refresh quotes"
                data-testid="button-refresh-quotes"
              >
                <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              </Button>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {quotes?.length || 0} quote{(quotes?.length || 0) !== 1 ? "s" : ""} for this project
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <ScrollArea className="h-[300px] sm:h-[400px] lg:h-[500px] pr-2 sm:pr-4">
              {quotesLoading ? (
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 sm:h-24" />
                  ))}
                </div>
              ) : quotesError ? (
                <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
                  Failed to load quotes
                </div>
              ) : !quotes?.length ? (
                <div className="text-center py-6 sm:py-8">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs sm:text-sm text-muted-foreground">No quotes yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 sm:mt-4 text-xs sm:text-sm"
                    onClick={() => createDraftMutation.mutate()}
                    disabled={createDraftMutation.isPending}
                    data-testid="button-create-first-quote"
                  >
                    Create First Quote
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {quotes.map((quote) => {
                    const status = statusConfig[quote.status] || statusConfig.draft;
                    const StatusIcon = status.icon;
                    const isSelected = selectedQuote?.id === quote.id;
                    
                    return (
                      <div
                        key={quote.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedQuote(quote)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') setSelectedQuote(quote);
                        }}
                        className={`p-2 sm:p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? "border-primary bg-primary/5" 
                            : "hover:border-muted-foreground/50"
                        }`}
                        data-testid={`quote-item-${quote.quoteNumber}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <span className="font-medium text-xs sm:text-sm">#{quote.quoteNumber}</span>
                            <span className="text-muted-foreground ml-1 sm:ml-2 text-xs sm:text-sm">v{quote.version}</span>
                          </div>
                          <Badge variant={status.variant} className="gap-1 text-xs shrink-0">
                            <StatusIcon className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline">{status.label}</span>
                          </Badge>
                        </div>
                        <div className="text-base sm:text-lg font-semibold">
                          {formatCurrency(quote.total, quote.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                          {quote.sentAt
                            ? `Sent ${formatDistanceToNow(new Date(quote.sentAt), { addSuffix: true })}`
                            : `Created ${formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {selectedQuote ? (
            <>
              <Card>
                <CardHeader className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                        <span className="truncate">Quote #{selectedQuote.quoteNumber}</span>
                        <Badge variant={statusConfig[selectedQuote.status]?.variant || "outline"} className="text-xs shrink-0">
                          {statusConfig[selectedQuote.status]?.label || selectedQuote.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-1">
                        Version {selectedQuote.version} • Last updated{" "}
                        {formatDistanceToNow(new Date(selectedQuote.updatedAt), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0" aria-label="Quote actions" data-testid="button-quote-actions">
                          <MoreHorizontal className="h-4 w-4 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => duplicateQuoteMutation.mutate(selectedQuote.id)}
                          data-testid="menu-duplicate-quote"
                        >
                          <Copy className="h-4 w-4 mr-2 shrink-0" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem data-testid="menu-preview-quote">
                          <Eye className="h-4 w-4 mr-2 shrink-0" />
                          Preview PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          data-testid="menu-delete-quote"
                        >
                          <Trash2 className="h-4 w-4 mr-2 shrink-0" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                        <p className="text-sm sm:text-base font-semibold truncate" data-testid="text-quote-total">
                          {formatCurrency(selectedQuote.total, selectedQuote.currency)}
                        </p>
                      </div>
                    </div>
                    {selectedQuote.customerName && (
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">Customer</p>
                          <p className="text-sm sm:text-base font-semibold truncate" data-testid="text-customer-name">
                            {selectedQuote.customerName}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedQuote.customerCompany && (
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                          <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">Company</p>
                          <p className="text-sm sm:text-base font-semibold truncate">{selectedQuote.customerCompany}</p>
                        </div>
                      </div>
                    )}
                    {selectedQuote.expiresAt && (
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                          <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">Expires</p>
                          <p className="text-sm sm:text-base font-semibold">
                            {format(new Date(selectedQuote.expiresAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t p-3 sm:p-4 gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={() => openSendDialog(selectedQuote)}
                    disabled={selectedQuote.status === "approved"}
                    className="text-xs sm:text-sm"
                    data-testid="button-send-quote"
                  >
                    <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                    Send Quote
                  </Button>
                  <Link href={`/client-portal/quotes/${selectedQuote.id}`} target="_blank">
                    <Button size="sm" variant="outline" className="text-xs sm:text-sm" data-testid="button-view-portal">
                      <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                      <span className="hidden sm:inline">View in Portal</span>
                      <span className="sm:hidden">Portal</span>
                    </Button>
                  </Link>
                </CardFooter>
              </Card>

              <Tabs defaultValue="activity" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="activity" className="text-xs sm:text-sm" data-testid="tab-activity">
                    <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="approvals" className="text-xs sm:text-sm" data-testid="tab-approvals">
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                    Approvals
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="activity">
                  <Card>
                    <CardHeader className="p-3 sm:p-4">
                      <CardTitle className="text-sm sm:text-base">Delivery Activity</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Track when quotes are sent, opened, and clicked
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      {!deliveryEvents?.length ? (
                        <div className="text-center py-6 sm:py-8">
                          <Clock className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs sm:text-sm text-muted-foreground">No delivery events yet</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Events will appear here when you send the quote
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 sm:space-y-4">
                          {deliveryEvents.map((event) => (
                            <div
                              key={event.id}
                              className="flex items-start gap-2 sm:gap-4 border-l-2 border-muted pl-2 sm:pl-4"
                              data-testid={`event-${event.eventType}`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <span className="font-medium text-xs sm:text-sm">
                                    {eventTypeLabels[event.eventType] || event.eventType}
                                  </span>
                                  <Badge variant="outline" className="text-xs shrink-0">{event.channel}</Badge>
                                </div>
                                {event.recipientEmail && (
                                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                    To: {event.recipientEmail}
                                  </p>
                                )}
                                {event.errorMessage && (
                                  <p className="text-xs sm:text-sm text-destructive">{event.errorMessage}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                                  {format(new Date(event.createdAt), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="approvals">
                  <Card>
                    <CardHeader className="p-3 sm:p-4">
                      <CardTitle className="text-sm sm:text-base">Approval History</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Customer decisions on this quote
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 pt-0">
                      {!approvals?.length ? (
                        <div className="text-center py-6 sm:py-8">
                          <FileText className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs sm:text-sm text-muted-foreground">No approvals yet</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Approvals will appear when the customer responds
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 sm:space-y-4">
                          {approvals.map((approval) => (
                            <div
                              key={approval.id}
                              className="p-2 sm:p-4 rounded-lg border"
                              data-testid={`approval-${approval.decision}`}
                            >
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                                {approval.decision === "approved" ? (
                                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive shrink-0" />
                                )}
                                <span className="font-medium text-xs sm:text-sm">
                                  {approval.decision === "approved" ? "Approved" : "Declined"}
                                </span>
                                <Badge variant="outline" className="text-xs shrink-0">{approval.method}</Badge>
                              </div>
                              {approval.approverName && (
                                <p className="text-xs sm:text-sm truncate">
                                  By: {approval.approverName}
                                  {approval.approverEmail && ` (${approval.approverEmail})`}
                                </p>
                              )}
                              {approval.comments && (
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2 italic">
                                  "{approval.comments}"
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1 sm:mt-2">
                                {format(new Date(approval.signedAt), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 p-3 sm:p-6">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">Select a Quote</h3>
                <p className="text-xs sm:text-sm text-muted-foreground text-center mb-3 sm:mb-4">
                  Choose a quote from the list to view details and send to the customer
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => createDraftMutation.mutate()}
                  disabled={createDraftMutation.isPending}
                  className="text-xs sm:text-sm"
                  data-testid="button-create-quote-empty"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                  Create New Quote
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Send Quote</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Choose how you want to send this quote to the customer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Delivery Method</Label>
              <Select value={sendMethod} onValueChange={(v: any) => setSendMethod(v)}>
                <SelectTrigger className="text-xs sm:text-sm" data-testid="select-send-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span className="text-xs sm:text-sm">Email</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="portal">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span className="text-xs sm:text-sm">Portal Notification</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="docusign">
                    <div className="flex items-center gap-2">
                      <PenTool className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                      <span className="text-xs sm:text-sm">DocuSign</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sendMethod === "email" && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="recipient" className="text-xs sm:text-sm">Recipient Email</Label>
                <Input
                  id="recipient"
                  type="email"
                  placeholder="customer@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="text-sm"
                  data-testid="input-recipient-email"
                />
              </div>
            )}

            {sendMethod === "portal" && portalShares && portalShares.length > 0 && (
              <div className="rounded-lg bg-muted p-2 sm:p-3">
                <p className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">Portal Users</p>
                <div className="space-y-1">
                  {portalShares.filter(s => s.status === "active").map(share => (
                    <div key={share.id} className="text-xs sm:text-sm flex items-center gap-2 min-w-0">
                      <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">{share.name || share.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="message" className="text-xs sm:text-sm">Personal Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal note to include with the quote..."
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={3}
                className="text-sm"
                data-testid="input-personal-message"
              />
            </div>

            <div className="rounded-lg bg-muted p-2 sm:p-3">
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs sm:text-sm">Quote Total</span>
                <span className="text-sm sm:text-base font-semibold">
                  {selectedQuote && formatCurrency(selectedQuote.total, selectedQuote.currency)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSendDialog(false)}
              className="text-xs sm:text-sm"
              data-testid="button-cancel-send"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendQuote}
              disabled={sendQuoteMutation.isPending}
              className="text-xs sm:text-sm"
              data-testid="button-confirm-send"
            >
              {sendQuoteMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
              ) : (
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
              )}
              Send Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function QuoteDeliveryPage() {
  const [, params] = useRoute("/projects/:projectId/quote-delivery");
  const projectId = params?.projectId;

  // If no projectId, show project list view
  if (!projectId) {
    return <ProjectListView />;
  }

  return <ProjectQuoteDelivery projectId={projectId} />;
}
