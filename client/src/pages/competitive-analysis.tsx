import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Target, TrendingUp, TrendingDown, Award, Building2, DollarSign } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { ErrorState } from "@/components/error-state";
import type { Competitor } from "@shared/schema";

export default function CompetitiveAnalysisPage() {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);

  // Fetch competitors
  const { 
    data: competitors, 
    isLoading: competitorsLoading,
    isError: competitorsError,
    error: competitorsErrorObj,
    refetch: refetchCompetitors
  } = useQuery<Competitor[]>({
    queryKey: ["/api/competitive/competitors"],
  });

  // Fetch win/loss analytics
  const { 
    data: winLossData, 
    isLoading: analyticsLoading,
    isError: analyticsError,
    error: analyticsErrorObj,
    refetch: refetchAnalytics
  } = useQuery<any>({
    queryKey: ["/api/competitive/analytics/win-loss"],
  });

  if (competitorsLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="loading-competitive">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (competitorsError) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6">
        <ErrorState
          title="Failed to load competitors"
          message={competitorsErrorObj instanceof Error ? competitorsErrorObj.message : "Unable to fetch competitor data"}
          error={competitorsErrorObj as Error}
          onRetry={refetchCompetitors}
          testId="error-competitors"
        />
      </div>
    );
  }

  if (analyticsError) {
    return (
      <div className="container mx-auto p-3 sm:p-4 md:p-6">
        <ErrorState
          title="Failed to load analytics"
          message={analyticsErrorObj instanceof Error ? analyticsErrorObj.message : "Unable to fetch win/loss analytics data"}
          error={analyticsErrorObj as Error}
          onRetry={refetchAnalytics}
          testId="error-analytics"
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-competitive-analysis">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="heading-competitive">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            Competitive Analysis
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track competitors, analyze market position, and improve win rates
          </p>
        </div>
        <Button data-testid="button-add-competitor" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
          <Building2 className="h-4 w-4 mr-2 shrink-0" />
          Add Competitor
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full sm:w-auto flex flex-wrap">
          <TabsTrigger value="overview" data-testid="tab-overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="competitors" data-testid="tab-competitors" className="text-xs sm:text-sm">Competitors</TabsTrigger>
          <TabsTrigger value="win-loss" data-testid="tab-win-loss" className="text-xs sm:text-sm hidden sm:flex">Win/Loss</TabsTrigger>
          <TabsTrigger value="pricing" data-testid="tab-pricing" className="text-xs sm:text-sm hidden sm:flex">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {/* Win Rate */}
            <Card data-testid="card-win-rate">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Win Rate</CardTitle>
                <Award className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold" data-testid="value-win-rate">
                  {winLossData?.winRate || "0.0"}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {winLossData?.won || 0} of {winLossData?.totalBids || 0} bids won
                </p>
              </CardContent>
            </Card>

            {/* Total Competitors */}
            <Card data-testid="card-total-competitors">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Tracked Competitors</CardTitle>
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold" data-testid="value-total-competitors">
                  {competitors?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active market players
                </p>
              </CardContent>
            </Card>

            {/* Lost Bids */}
            <Card data-testid="card-lost-bids">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Lost Bids</CardTitle>
                <TrendingDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold" data-testid="value-lost-bids">
                  {winLossData?.lost || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Opportunities to improve
                </p>
              </CardContent>
            </Card>

            {/* Avg Competitor Quote */}
            <Card data-testid="card-avg-competitor-quote">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Avg Competitor Quote</CardTitle>
                <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="text-xl sm:text-2xl font-bold" data-testid="value-avg-competitor-quote">
                  ${(winLossData?.avgCompetitorQuote || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  vs ${(winLossData?.avgOurQuote || 0).toLocaleString()} our avg
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Win/Loss Summary */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">Bidding Performance</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Overview of competitive bidding outcomes</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="grid gap-3 sm:gap-4 grid-cols-3 text-center">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{winLossData?.won || 0}</div>
                  <div className="text-xs text-muted-foreground">Won</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">{winLossData?.lost || 0}</div>
                  <div className="text-xs text-muted-foreground">Lost</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{winLossData?.ongoing || 0}</div>
                  <div className="text-xs text-muted-foreground">Ongoing</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-3 sm:space-y-4">
          {competitors && competitors.length > 0 ? (
            <div className="grid gap-3 sm:gap-4">
              {competitors.map((comp) => (
                <Card key={comp.id} data-testid={`competitor-card-${comp.id}`}>
                  <CardHeader className="p-3 sm:p-4 md:p-6">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base sm:text-lg min-w-0">{comp.companyName}</CardTitle>
                      <Badge variant={comp.isActive === "yes" ? "default" : "secondary"} className="shrink-0 text-xs">
                        {comp.isActive === "yes" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {comp.industry && (
                      <CardDescription className="text-xs sm:text-sm">{comp.industry}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-2">
                    {comp.headquarters && (
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium">Headquarters:</span> {comp.headquarters}
                        </div>
                    )}
                    {comp.strengths && (
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium">Strengths:</span> {comp.strengths}
                      </div>
                    )}
                    {comp.weaknesses && (
                      <div className="text-xs sm:text-sm">
                        <span className="font-medium">Weaknesses:</span> {comp.weaknesses}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 p-3 sm:p-4">
                <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">No competitors tracked yet</h3>
                <p className="text-xs sm:text-sm text-muted-foreground text-center mb-3 sm:mb-4">
                  Start tracking your market competition to gain strategic insights
                </p>
                <Button data-testid="button-add-first-competitor" size="sm" className="text-xs sm:text-sm">
                  Add Your First Competitor
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="win-loss" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">Win/Loss Analysis</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Track competitive outcomes and identify improvement opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="text-center text-xs sm:text-sm text-muted-foreground py-6 sm:py-8">
                Win/loss tracking enables you to understand why you win or lose bids against competitors
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-3 sm:space-y-4">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">Pricing Intelligence</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Monitor competitor pricing trends and market positioning
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="text-center text-xs sm:text-sm text-muted-foreground py-6 sm:py-8">
                Track competitor product pricing to maintain competitive positioning
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
