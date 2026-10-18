import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { CheckCircle, XCircle, AlertCircle, Clock, Send, CreditCard, DollarSign, Search, Loader2, Lock, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { QuoteRequest } from "@shared/schema";
import { ROLE_HIERARCHY, MEMBERSHIP_ROLES } from "@shared/schema";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { UpsellDialog } from "@/components/upsell-dialog";

export default function EngineeringReview() {
  const { toast } = useToast();
  const { hasFeatureAccess, hasAddon, currentTier, upsellConfig, closeUpsell } = useFeatureAccess();
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | "revise" | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Customer Approval State
  const [showCustomerApproval, setShowCustomerApproval] = useState(false);
  const [customerQuote, setCustomerQuote] = useState<QuoteRequest | null>(null);
  const [approverName, setApproverName] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const { 
    data: user,
    isError: userError,
    error: userErrorObj,
    refetch: refetchUser
  } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  // Check if user has access to engineering review
  const hasAccess = hasFeatureAccess("engineeringReview");

  const { 
    data: quotes, 
    isLoading,
    isError: quotesError,
    error: quotesErrorObj,
    refetch: refetchQuotes
  } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
    enabled: hasAccess, // Only fetch if user has access
  });

  // Check if user has engineer role or higher
  const canReview = user?.role && ROLE_HIERARCHY[user.role as keyof typeof ROLE_HIERARCHY] >= ROLE_HIERARCHY[MEMBERSHIP_ROLES.ENGINEER];

  // Filter quotes with search
  const filteredQuotes = useMemo(() => {
    if (!quotes || !searchQuery.trim()) return quotes || [];
    
    const query = searchQuery.toLowerCase();
    return quotes.filter(quote => 
      quote.id.toLowerCase().includes(query) ||
      quote.manufacturerContactId?.toLowerCase().includes(query) ||
      quote.projectId?.toLowerCase().includes(query)
    );
  }, [quotes, searchQuery]);

  const approveMutation = useMutation({
    mutationFn: async ({ id, reviewerName, reviewNotes }: { id: string; reviewerName: string; reviewNotes: string }) => {
      // Guard: silently no-op if user doesn't have access (they shouldn't reach this anyway due to paywall)
      if (!hasAccess) {
        return null;
      }
      
      const res = await apiRequest("POST", `/api/quote-requests/${id}/approve`, { reviewerName, reviewNotes });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Approval failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Only show success if the mutation actually ran (not blocked by guard)
      if (!data) return;
      
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      toast({
        title: "Quote approved",
        description: "Quote has been approved and is ready for customer submission",
      });
      closeDialog();
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Approval failed",
        description: errorMessage.includes("permission") || errorMessage.includes("unauthorized")
          ? "You don't have permission to approve quotes"
          : errorMessage.includes("not found") || errorMessage.includes("exist")
          ? "Quote not found. It may have been deleted"
          : errorMessage || "Unable to approve quote. Please try again",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reviewerName, reviewNotes }: { id: string; reviewerName: string; reviewNotes: string }) => {
      // Guard: silently no-op if user doesn't have access (they shouldn't reach this anyway due to paywall)
      if (!hasAccess) {
        return null;
      }
      
      const res = await apiRequest("POST", `/api/quote-requests/${id}/reject`, { reviewerName, reviewNotes });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Rejection failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Only show success if the mutation actually ran (not blocked by guard)
      if (!data) return;
      
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      toast({
        title: "Quote rejected",
        description: "Quote has been rejected with feedback provided to the team",
      });
      closeDialog();
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Rejection failed",
        description: errorMessage.includes("permission") || errorMessage.includes("unauthorized")
          ? "You don't have permission to reject quotes"
          : errorMessage.includes("not found") || errorMessage.includes("exist")
          ? "Quote not found. It may have been deleted"
          : errorMessage || "Unable to reject quote. Please try again",
        variant: "destructive",
      });
    },
  });

  const revisionMutation = useMutation({
    mutationFn: async ({ id, reviewerName, reviewNotes }: { id: string; reviewerName: string; reviewNotes: string }) => {
      // Guard: silently no-op if user doesn't have access (they shouldn't reach this anyway due to paywall)
      if (!hasAccess) {
        return null;
      }
      
      const res = await apiRequest("POST", `/api/quote-requests/${id}/request-revision`, { reviewerName, reviewNotes });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Revision request failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      // Only show success if the mutation actually ran (not blocked by guard)
      if (!data) return;
      
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      toast({
        title: "Revision requested",
        description: "Quote has been sent back with specific revision feedback",
      });
      closeDialog();
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Revision request failed",
        description: errorMessage.includes("permission") || errorMessage.includes("unauthorized")
          ? "You don't have permission to request quote revisions"
          : errorMessage.includes("not found") || errorMessage.includes("exist")
          ? "Quote not found. It may have been deleted"
          : errorMessage || "Unable to request revisions. Please try again",
        variant: "destructive",
      });
    },
  });

  const customerApproveMutation = useMutation({
    mutationFn: async ({ id, approverName, tier, notes, paymentAmount }: { id: string; approverName: string; tier: string; notes: string; paymentAmount: number }) => {
      const res = await apiRequest("POST", `/api/quote-requests/${id}/customer-approve`, { approverName, tier, notes, paymentAmount });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Customer approval failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      toast({
        title: "Customer approval recorded",
        description: "Quote has been approved by customer. You can now process payment",
      });
      closeCustomerApprovalDialog();
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Customer approval failed",
        description: errorMessage.includes("tier") || errorMessage.includes("amount")
          ? "Invalid tier or payment amount. Please check your input"
          : errorMessage.includes("not found") || errorMessage.includes("exist")
          ? "Quote not found. It may have been deleted"
          : errorMessage.includes("already") || errorMessage.includes("duplicate")
          ? "This quote has already been approved by the customer"
          : errorMessage || "Unable to record customer approval. Please try again",
        variant: "destructive",
      });
    },
  });

  const closeDialog = () => {
    setSelectedQuote(null);
    setReviewAction(null);
    setReviewerName("");
    setReviewNotes("");
  };

  const closeCustomerApprovalDialog = () => {
    setShowCustomerApproval(false);
    setCustomerQuote(null);
    setApproverName("");
    setSelectedTier("");
    setPaymentAmount("");
    setCustomerNotes("");
  };

  const handleCustomerApproval = () => {
    if (!customerQuote || !selectedTier || !paymentAmount) {
      toast({
        title: "Required Fields Missing",
        description: "Please select a tier and enter payment amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    customerApproveMutation.mutate({
      id: customerQuote.id,
      approverName: approverName.trim() || "Customer",
      tier: selectedTier,
      notes: customerNotes.trim(),
      paymentAmount: amount,
    });
  };

  const handleReviewAction = () => {
    if (!selectedQuote || !reviewAction) return;

    if ((reviewAction === "reject" || reviewAction === "revise") && !reviewNotes.trim()) {
      toast({
        title: "Review Notes Required",
        description: "Please provide notes when rejecting or requesting revisions.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      id: selectedQuote.id,
      reviewerName: reviewerName.trim() || "Engineering",
      reviewNotes: reviewNotes.trim() || (reviewAction === "approve" ? "Approved for customer submission" : ""),
    };

    if (reviewAction === "approve") {
      approveMutation.mutate(payload);
    } else if (reviewAction === "reject") {
      rejectMutation.mutate(payload);
    } else if (reviewAction === "revise") {
      revisionMutation.mutate(payload);
    }
  };

  const getStatusBadge = (reviewStatus: string) => {
    switch (reviewStatus) {
      case "draft":
        return <Badge variant="secondary" data-testid={`badge-status-draft`}><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case "pending_review":
        return <Badge className="bg-yellow-600" data-testid={`badge-status-pending`}><AlertCircle className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-green-600" data-testid={`badge-status-approved`}><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" data-testid={`badge-status-rejected`}><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "needs_revision":
        return <Badge className="bg-orange-600" data-testid={`badge-status-revision`}><AlertCircle className="h-3 w-3 mr-1" />Needs Revision</Badge>;
      default:
        return <Badge variant="secondary" data-testid={`badge-status-unknown`}>{reviewStatus}</Badge>;
    }
  };

  const pendingQuotes = filteredQuotes?.filter((q) => q.reviewStatus === "pending_review") || [];
  const approvedQuotes = filteredQuotes?.filter((q) => q.reviewStatus === "approved") || [];
  const needsRevisionQuotes = filteredQuotes?.filter((q) => q.reviewStatus === "needs_revision") || [];
  const rejectedQuotes = filteredQuotes?.filter((q) => q.reviewStatus === "rejected") || [];
  const draftQuotes = filteredQuotes?.filter((q) => q.reviewStatus === "draft") || [];

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="loading-engineering-review">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Engineering Review</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Review manufacturer quote requests before customer submission</p>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (userError) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <ErrorState
          title="Failed to load user profile"
          message={userErrorObj instanceof Error ? userErrorObj.message : "Unable to verify your permissions"}
          error={userErrorObj as Error}
          onRetry={refetchUser}
          testId="error-user"
        />
      </div>
    );
  }

  if (quotesError) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <ErrorState
          title="Failed to load quote requests"
          message={quotesErrorObj instanceof Error ? quotesErrorObj.message : "Unable to fetch quote requests for review"}
          error={quotesErrorObj as Error}
          onRetry={refetchQuotes}
          testId="error-quotes"
        />
      </div>
    );
  }

  // Show paywall for users without access
  if (!hasAccess) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8" data-testid="page-engineering-review-locked">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center space-y-3 sm:space-y-4 p-3 sm:p-6">
            <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <CardTitle className="text-xl sm:text-2xl">Engineering Review</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Professional quote review workflow with approval tracking
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h3 className="font-semibold text-xs sm:text-sm">What's included:</h3>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li className="flex items-start gap-2 min-w-0">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Approve/reject quote requests before customer submission</span>
                </li>
                <li className="flex items-start gap-2 min-w-0">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Request revisions with detailed feedback</span>
                </li>
                <li className="flex items-start gap-2 min-w-0">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Track reviewer names and approval history</span>
                </li>
                <li className="flex items-start gap-2 min-w-0">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Customer approval tracking with payment status</span>
                </li>
                <li className="flex items-start gap-2 min-w-0">
                  <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>Searchable quote dashboard with status filtering</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border">
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <p className="font-semibold text-xs sm:text-sm">Add as À La Carte Add-on</p>
                  <p className="text-xs text-muted-foreground">For Professional plan</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm sm:text-base">$99<span className="text-xs sm:text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-xs text-muted-foreground">or $792/yr</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border bg-primary/5">
                <div className="space-y-0.5 sm:space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <p className="font-semibold text-xs sm:text-sm">Included in Enterprise Plan</p>
                    <Badge className="gap-1 text-xs shrink-0">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      Best Value
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Plus all enterprise features</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm sm:text-base">$399<span className="text-xs sm:text-sm font-normal text-muted-foreground">/mo</span></p>
                  <p className="text-xs text-muted-foreground">or $3,192/yr</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                className="w-full gap-2 text-xs sm:text-sm"
                asChild
                data-testid="button-upgrade-to-enterprise"
              >
                <Link href="/billing">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  Upgrade to Access Engineering Review
                </Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Your current plan: <span className="font-semibold capitalize">{currentTier}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6" data-testid="page-engineering-review">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="heading-engineering-review">Engineering Review</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Review manufacturer quote requests before customer submission</p>
        </div>
        <div className="relative w-full sm:w-56 md:w-64 shrink-0">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search quotes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 sm:pl-9 text-sm"
            data-testid="input-search-quotes"
          />
        </div>
      </div>

      {/* Pending Review Section */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 shrink-0" />
            Pending Review ({pendingQuotes.length})
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Quotes waiting for engineering approval</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-3 sm:space-y-4">
          {pendingQuotes.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground" data-testid="text-no-pending">No quotes pending review</p>
          ) : (
            pendingQuotes.map((quote) => (
              <Card key={quote.id} className="hover-elevate" data-testid={`card-quote-${quote.id}`}>
                <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h3 className="font-semibold text-sm sm:text-base" data-testid={`text-quote-id-${quote.id}`}>Quote #{quote.id.slice(0, 8)}</h3>
                        <span className="shrink-0">{getStatusBadge(quote.reviewStatus)}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Project: {quote.projectId.slice(0, 8)}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Submitted: {quote.submittedForReviewAt ? new Date(quote.submittedForReviewAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    {canReview ? (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 text-xs sm:text-sm flex-1 sm:flex-none"
                          onClick={() => {
                            setSelectedQuote(quote);
                            setReviewAction("approve");
                          }}
                          data-testid={`button-approve-${quote.id}`}
                        >
                          <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-orange-600 text-xs sm:text-sm flex-1 sm:flex-none"
                          onClick={() => {
                            setSelectedQuote(quote);
                            setReviewAction("revise");
                          }}
                          data-testid={`button-revise-${quote.id}`}
                        >
                          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
                          <span className="hidden sm:inline">Request </span>Revision
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-xs sm:text-sm flex-1 sm:flex-none"
                          onClick={() => {
                            setSelectedQuote(quote);
                            setReviewAction("reject");
                          }}
                          data-testid={`button-reject-${quote.id}`}
                        >
                          <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 shrink-0" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs shrink-0">
                        Engineer+ Required
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* Other Sections */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Approved Quotes */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-green-600 text-base sm:text-lg">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Approved ({approvedQuotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-2 sm:space-y-3">
            {approvedQuotes.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">No approved quotes</p>
            ) : (
              approvedQuotes.map((quote) => (
                <Card key={quote.id} className="p-2 sm:p-3" data-testid={`approved-quote-${quote.id}`}>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm">#{quote.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          Approved by {quote.reviewedBy || "Engineering"}
                        </p>
                      </div>
                      <span className="shrink-0">{getStatusBadge(quote.reviewStatus)}</span>
                    </div>
                    
                    {/* Customer Approval Status */}
                    {quote.customerApprovalStatus && (
                      <div className="pt-2 border-t space-y-1.5 sm:space-y-2">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="text-muted-foreground">Customer:</span>
                          <Badge variant={quote.customerApprovalStatus === "approved" ? "default" : "secondary"} className="capitalize text-xs shrink-0">
                            {quote.customerApprovalStatus}
                          </Badge>
                        </div>
                        {quote.customerApprovalTier && (
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="text-muted-foreground">Tier:</span>
                            <Badge variant="outline" className="capitalize text-xs shrink-0">
                              {quote.customerApprovalTier}
                            </Badge>
                          </div>
                        )}
                        {quote.paymentStatus && (
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="text-muted-foreground">Payment:</span>
                            <Badge variant={quote.paymentStatus === "paid" ? "default" : "secondary"} className="capitalize text-xs bg-green-600 shrink-0">
                              {quote.paymentStatus}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2">
                      {quote.customerApprovalStatus === "pending" || !quote.customerApprovalStatus ? (
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs sm:text-sm"
                          onClick={() => {
                            setCustomerQuote(quote);
                            setShowCustomerApproval(true);
                          }}
                          data-testid={`button-customer-approve-${quote.id}`}
                        >
                          <CheckCircle className="h-3 w-3 mr-1 shrink-0" />
                          <span className="hidden sm:inline">Customer </span>Approve
                        </Button>
                      ) : quote.paymentStatus !== "paid" && quote.customerApprovalStatus === "approved" ? (
                        <Badge variant="outline" className="text-xs">
                          Arrange payment offline
                        </Badge>
                      ) : quote.paymentStatus === "paid" ? (
                        <Badge variant="default" className="bg-green-600 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1 shrink-0" />
                          Paid
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Needs Revision */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-orange-600 text-base sm:text-lg">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Needs Revision ({needsRevisionQuotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0 space-y-2">
            {needsRevisionQuotes.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">No quotes need revision</p>
            ) : (
              needsRevisionQuotes.map((quote) => (
                <div key={quote.id} className="p-2 sm:p-3 border rounded-md" data-testid={`revision-quote-${quote.id}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2 min-w-0">
                    <p className="font-medium text-xs sm:text-sm">#{quote.id.slice(0, 8)}</p>
                    <span className="shrink-0">{getStatusBadge(quote.reviewStatus)}</span>
                  </div>
                  {quote.reviewNotes && (
                    <p className="text-xs text-muted-foreground">{quote.reviewNotes}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Action Dialog */}
      <Dialog open={!!reviewAction} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg p-4 sm:p-6" data-testid="dialog-review-action">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {reviewAction === "approve" && "Approve Quote"}
              {reviewAction === "reject" && "Reject Quote"}
              {reviewAction === "revise" && "Request Revisions"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {reviewAction === "approve" && "Approve this quote for customer submission"}
              {reviewAction === "reject" && "Reject this quote with feedback"}
              {reviewAction === "revise" && "Request revisions with specific feedback"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="reviewer-name" className="text-xs sm:text-sm">Reviewer Name (Optional)</Label>
              <Input
                id="reviewer-name"
                placeholder="Engineering Team"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="text-sm"
                data-testid="input-reviewer-name"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="review-notes" className="text-xs sm:text-sm">
                Review Notes {(reviewAction === "reject" || reviewAction === "revise") && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="review-notes"
                placeholder={
                  reviewAction === "approve"
                    ? "Optional approval notes..."
                    : "Provide specific feedback about what needs to be changed..."
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                className="text-sm"
                data-testid="textarea-review-notes"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" size="sm" onClick={closeDialog} className="w-full sm:w-auto text-xs sm:text-sm" data-testid="button-cancel-review">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReviewAction}
              disabled={
                approveMutation.isPending || rejectMutation.isPending || revisionMutation.isPending
              }
              data-testid="button-confirm-review"
              className={`w-full sm:w-auto text-xs sm:text-sm ${
                reviewAction === "approve"
                  ? "bg-green-600"
                  : reviewAction === "reject"
                  ? ""
                  : "bg-orange-600"
              }`}
              variant={reviewAction === "reject" ? "destructive" : "default"}
            >
              {reviewAction === "approve" && "Approve"}
              {reviewAction === "reject" && "Reject"}
              {reviewAction === "revise" && "Request Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Approval Dialog */}
      <Dialog open={showCustomerApproval} onOpenChange={(open) => !open && closeCustomerApprovalDialog()}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg p-4 sm:p-6" data-testid="dialog-customer-approval">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Customer Approval
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Record customer approval with tier selection and payment amount
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="approver-name" className="text-xs sm:text-sm">Customer Name (Optional)</Label>
              <Input
                id="approver-name"
                placeholder="Customer Name"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                className="text-sm"
                data-testid="input-approver-name"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="tier-select" className="text-xs sm:text-sm">
                Service Tier <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger id="tier-select" className="text-sm" data-testid="select-tier">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic" className="text-sm">Basic - Standard Service</SelectItem>
                  <SelectItem value="standard" className="text-sm">Standard - Enhanced Service</SelectItem>
                  <SelectItem value="premium" className="text-sm">Premium - Priority Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="payment-amount" className="text-xs sm:text-sm">
                Payment Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 sm:left-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-8 sm:pl-9 text-sm"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  data-testid="input-payment-amount"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="customer-notes" className="text-xs sm:text-sm">Notes (Optional)</Label>
              <Textarea
                id="customer-notes"
                placeholder="Additional notes or special requests..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={3}
                className="text-sm"
                data-testid="textarea-customer-notes"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" size="sm" onClick={closeCustomerApprovalDialog} className="w-full sm:w-auto text-xs sm:text-sm" data-testid="button-cancel-customer-approval">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCustomerApproval}
              disabled={customerApproveMutation.isPending || !selectedTier || !paymentAmount}
              data-testid="button-confirm-customer-approval"
              className="bg-green-600 w-full sm:w-auto text-xs sm:text-sm"
            >
              {customerApproveMutation.isPending ? (
                <>
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                  <span className="hidden sm:inline">Approve & Continue to Payment</span>
                  <span className="sm:hidden">Approve</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
