import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Package,
  Target,
  BarChart3,
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ErrorState } from "@/components/error-state";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Paywall } from "@/components/paywall";

interface QuoteWithMetrics {
  id: string;
  projectId: string;
  projectName: string;
  customerName?: string;
  customerId?: string;
  reviewStatus: string;
  totalRevenue: number;
  totalCost: number;
  totalListPrice: number;
  marginPercent: number;
  marginDollar: number;
  daysOld: number;
  isExpired: boolean;
  productCount: number;
  createdAt: string;
}

interface KPIData {
  totalQuotes: number;
  approvedQuotes: number;
  rejectedQuotes: number;
  pendingQuotes: number;
  paidQuotes: number;
  closingRatio: number;
  averageMarginPercent: number;
  averageMarginDollar: number;
  expiredQuotes: number;
  recentQuotes: number;
  deadQuotes: number;
  totalQuoteValue: number;
  avgQuoteValue: number;
}

export default function QuoteAnalytics() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { hasFeatureAccess, currentTier } = useFeatureAccess();

  // Check if user has access to Quote Analytics (advancedReporting feature, Professional+)
  const hasAccess = hasFeatureAccess("advancedReporting");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch KPIs (only if user has access)
  const { data: kpis, isLoading: kpisLoading, error: kpisError, refetch: refetchKpis } = useQuery<KPIData>({
    queryKey: ["/api/quote-analytics/kpis"],
    enabled: hasAccess,
  });

  // Build query string
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (statusFilter && statusFilter !== "all") params.append("statusFilter", statusFilter);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  };

  // Fetch quotes with analytics (only if user has access)
  const { data: quotes, isLoading: quotesLoading, error: quotesError, refetch: refetchQuotes } = useQuery<QuoteWithMetrics[]>({
    queryKey: ["/api/quote-analytics", debouncedSearch, statusFilter],
    enabled: hasAccess,
    queryFn: async () => {
      const response = await fetch(`/api/quote-analytics${buildQueryString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch quotes: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const isLoading = kpisLoading || quotesLoading;
  const error = kpisError || quotesError;

  // Show paywall if user doesn't have access (check is done before queries)
  if (!hasAccess) {
    return (
      <Paywall
        variant="fullPage"
        featureName="Quote Analytics"
        featureDescription="Track quote performance, analyze margins, monitor conversion rates, and gain insights into your quoting effectiveness."
        requiredTier="professional"
        currentTier={currentTier}
        type="tier"
      />
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <ErrorState
            title="Failed to load quote analytics"
            message={error instanceof Error ? error.message : "Unable to fetch analytics data. Please try again."}
            error={error as Error}
            onRetry={() => {
              refetchKpis();
              refetchQuotes();
            }}
            testId="error-quote-analytics"
            fullPage
          />
        </div>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      case "active":
        return "secondary";
      case "draft":
        return "outline";
      default:
        return "outline";
    }
  };

  const getPaymentBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Quote Analytics</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Search quotes and analyze sales performance metrics
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="hover-elevate transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium min-w-0">Closing Ratio</CardTitle>
              <div className="rounded-md bg-chart-1/10 p-1.5 sm:p-2 shrink-0">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-chart-1 shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {isLoading ? (
                <Skeleton className="h-7 sm:h-8 w-16 mb-1" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold" data-testid="text-closing-ratio">
                  {kpis?.closingRatio.toFixed(1)}%
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Paid / Approved quotes
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium min-w-0">Average Margin</CardTitle>
              <div className="rounded-md bg-chart-2/10 p-1.5 sm:p-2 shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-chart-2 shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {isLoading ? (
                <Skeleton className="h-7 sm:h-8 w-20 mb-1" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold" data-testid="text-average-margin">
                  {kpis?.averageMarginPercent.toFixed(1)}%
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                ${kpis?.averageMarginDollar.toLocaleString() || 0} avg profit
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium min-w-0">Outstanding Quotes</CardTitle>
              <div className="rounded-md bg-chart-3/10 p-1.5 sm:p-2 shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-chart-3 shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {isLoading ? (
                <Skeleton className="h-7 sm:h-8 w-12 mb-1" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold" data-testid="text-outstanding-quotes">
                  {kpis?.pendingQuotes || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Pending review or approval
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium min-w-0">Expired Quotes</CardTitle>
              <div className="rounded-md bg-chart-4/10 p-1.5 sm:p-2 shrink-0">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-chart-4 shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {isLoading ? (
                <Skeleton className="h-7 sm:h-8 w-12 mb-1" />
              ) : (
                <div className="text-xl sm:text-2xl font-bold" data-testid="text-expired-quotes">
                  {kpis?.expiredQuotes || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Over 30 days old
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium min-w-0">Total Quotes</CardTitle>
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {isLoading ? (
                <Skeleton className="h-5 sm:h-6 w-12" />
              ) : (
                <div className="text-lg sm:text-xl font-semibold" data-testid="text-total-quotes">
                  {kpis?.totalQuotes || 0}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 min-w-0">
                  <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                  {kpis?.approvedQuotes || 0} approved
                </span>
                <span className="flex items-center gap-1 min-w-0">
                  <XCircle className="h-3 w-3 text-red-600 shrink-0" />
                  {kpis?.rejectedQuotes || 0} rejected
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium min-w-0">Total Quote Value</CardTitle>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {isLoading ? (
                <Skeleton className="h-5 sm:h-6 w-24" />
              ) : (
                <div className="text-lg sm:text-xl font-semibold" data-testid="text-total-value">
                  ${kpis?.totalQuoteValue.toLocaleString() || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                ${kpis?.avgQuoteValue.toLocaleString() || 0} average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium min-w-0">Dead Quotes</CardTitle>
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              {isLoading ? (
                <Skeleton className="h-5 sm:h-6 w-12" />
              ) : (
                <div className="text-lg sm:text-xl font-semibold" data-testid="text-dead-quotes">
                  {kpis?.deadQuotes || 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Rejected & aged out
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Search Quotes</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Find quotes by customer, project, or product</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Search by customer or project name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-sm"
                  data-testid="input-search-quotes"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 text-xs sm:text-sm" data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quotes List */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Quote Results</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {quotes?.length || 0} quotes found
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {isLoading ? (
              <div className="space-y-2 sm:space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-3 sm:p-4 rounded-md border">
                    <Skeleton className="h-4 sm:h-5 w-48 sm:w-64 mb-2" />
                    <Skeleton className="h-3 sm:h-4 w-full mb-2" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-5 sm:h-6 w-16 sm:w-20" />
                      <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
                      <Skeleton className="h-5 sm:h-6 w-14 sm:w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : quotes && quotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-1">No quotes found</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3" data-testid="list-quotes">
                {quotes?.map((quote) => (
                  <Link key={quote.id} href={`/projects/${quote.projectId}`}>
                    <div
                      className="p-3 sm:p-4 rounded-md border hover-elevate active-elevate-2 transition-colors"
                      data-testid={`card-quote-${quote.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs sm:text-sm truncate">{quote.projectName}</h4>
                          {quote.customerName && (
                            <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                              Customer: {quote.customerName}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 items-start shrink-0">
                          <Badge variant={getStatusBadgeVariant(quote.reviewStatus)} className="text-xs shrink-0">
                            {quote.reviewStatus.charAt(0).toUpperCase() + quote.reviewStatus.slice(1)}
                          </Badge>
                          {quote.isExpired && (
                            <Badge variant="destructive" className="text-xs shrink-0">
                              <AlertTriangle className="h-3 w-3 mr-1 shrink-0" />
                              Expired
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs">
                        <div className="min-w-0">
                          <span className="text-muted-foreground">Quote Value</span>
                          <div className="font-medium mt-0.5 truncate">
                            ${quote.totalRevenue.toLocaleString()}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <span className="text-muted-foreground">Margin</span>
                          <div className="font-medium mt-0.5 flex items-center gap-1 min-w-0">
                            {quote.marginPercent > 30 ? (
                              <TrendingUp className="h-3 w-3 text-green-600 shrink-0" />
                            ) : quote.marginPercent > 15 ? (
                              <TrendingUp className="h-3 w-3 text-yellow-600 shrink-0" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-600 shrink-0" />
                            )}
                            {quote.marginPercent.toFixed(1)}%
                          </div>
                        </div>
                        <div className="min-w-0">
                          <span className="text-muted-foreground">Products</span>
                          <div className="font-medium mt-0.5 flex items-center gap-1 min-w-0">
                            <Package className="h-3 w-3 shrink-0" />
                            {quote.productCount}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <span className="text-muted-foreground">Age</span>
                          <div className="font-medium mt-0.5 flex items-center gap-1 min-w-0">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {quote.daysOld} days
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
