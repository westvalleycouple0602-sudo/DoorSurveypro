import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Mail,
  MousePointerClick,
  Rocket,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  PieChart,
} from "lucide-react";
import { format } from "date-fns";

interface AnalyticsData {
  overview: {
    totalSignups: number;
    emailOpenedCount: number;
    emailClickedCount: number;
    trialStartedCount: number;
    convertedToPaidCount: number;
    signupToEmailOpen: string;
    emailOpenToClick: string;
    clickToTrial: string;
    trialToPaid: string;
    overallConversion: string;
  };
  byCampaign: Array<{ campaign: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  byMedium: Array<{ medium: string; count: number }>;
  signupsOverTime: Array<{ date: string; count: number }>;
}

export default function MarketingAnalytics() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/prelaunch-signups/analytics"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 sm:h-8 w-48 sm:w-64" />
          <Skeleton className="h-4 w-72 sm:w-96" />
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 sm:h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto p-3 sm:p-4 lg:p-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <p className="text-center text-sm sm:text-base text-muted-foreground">No analytics data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview } = analytics;

  const funnelSteps = [
    {
      label: "Waitlist Signups",
      count: overview.totalSignups,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      label: "Email Opened",
      count: overview.emailOpenedCount,
      rate: overview.signupToEmailOpen,
      icon: Mail,
      color: "bg-purple-500",
    },
    {
      label: "Email Clicked",
      count: overview.emailClickedCount,
      rate: overview.emailOpenToClick,
      icon: MousePointerClick,
      color: "bg-indigo-500",
    },
    {
      label: "Trial Started",
      count: overview.trialStartedCount,
      rate: overview.clickToTrial,
      icon: Rocket,
      color: "bg-green-500",
    },
    {
      label: "Paid Customer",
      count: overview.convertedToPaidCount,
      rate: overview.trialToPaid,
      icon: CreditCard,
      color: "bg-emerald-500",
    },
  ];

  return (
    <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Marketing Analytics Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Pre-launch funnel metrics and conversion tracking for January 2026 launch
        </p>
      </div>

      {/* Overall Conversion */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
            Overall Conversion Rate
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">From waitlist signup to paying customer</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">{overview.overallConversion}%</div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
            {overview.convertedToPaidCount} paying customers from {overview.totalSignups} total signups
          </p>
        </CardContent>
      </Card>

      {/* Funnel Steps */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        {funnelSteps.map((step, index) => (
          <Card key={index} data-testid={`card-funnel-${step.label.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{step.label}</span>
                <step.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 space-y-1">
              <div className="text-lg sm:text-2xl font-bold">{step.count.toLocaleString()}</div>
              {step.rate && (
                <div className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {step.rate}% conversion
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {/* By Campaign */}
        <Card data-testid="card-by-campaign">
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="min-w-0">Signups by Campaign</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {analytics.byCampaign.length > 0 ? (
              <div className="space-y-2">
                {analytics.byCampaign.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-xs sm:text-sm truncate flex-1 min-w-0">{item.campaign || "No campaign"}</span>
                    <Badge variant="outline" className="shrink-0">{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">No campaign data yet</p>
            )}
          </CardContent>
        </Card>

        {/* By Source */}
        <Card data-testid="card-by-source">
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 shrink-0" />
              <span className="min-w-0">Signups by Source</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {analytics.bySource.length > 0 ? (
              <div className="space-y-2">
                {analytics.bySource.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-xs sm:text-sm truncate flex-1 min-w-0">{item.source || "No source"}</span>
                    <Badge variant="outline" className="shrink-0">{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">No source data yet</p>
            )}
          </CardContent>
        </Card>

        {/* By Medium */}
        <Card data-testid="card-by-medium">
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="min-w-0">Signups by Medium</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {analytics.byMedium.length > 0 ? (
              <div className="space-y-2">
                {analytics.byMedium.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-xs sm:text-sm truncate flex-1 min-w-0">{item.medium || "No medium"}</span>
                    <Badge variant="outline" className="shrink-0">{item.count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">No medium data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Signups Over Time */}
      <Card data-testid="card-signups-over-time">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="min-w-0">Signups Over Time (Last 30 Days)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          {analytics.signupsOverTime.length > 0 ? (
            <div className="space-y-2">
              {analytics.signupsOverTime.slice(0, 10).map((day: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between gap-2 hover-elevate p-1.5 sm:p-2 rounded min-w-0">
                  <span className="text-xs sm:text-sm shrink-0">{format(new Date(day.date), "MMM d, yyyy")}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="secondary" className="text-xs shrink-0">{day.count} signups</Badge>
                    <div 
                      className="h-2 rounded-full bg-primary shrink-0"
                      style={{ width: `${Math.max(day.count * 10, 20)}px` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground">No signups in the last 30 days</p>
          )}
        </CardContent>
      </Card>

      {/* Benchmark Goals */}
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-base sm:text-lg">2025 B2B SaaS Benchmarks</CardTitle>
          <CardDescription className="text-xs sm:text-sm">How we compare to industry standards</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs sm:text-sm min-w-0">Waitlist → Email Open</span>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <span className="text-xs sm:text-sm font-medium">{overview.signupToEmailOpen}%</span>
                  <Badge variant={parseFloat(overview.signupToEmailOpen) >= 45 ? "default" : "secondary"} className="text-xs shrink-0">
                    Target: 45%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs sm:text-sm min-w-0">Email Open → Click</span>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <span className="text-xs sm:text-sm font-medium">{overview.emailOpenToClick}%</span>
                  <Badge variant={parseFloat(overview.emailOpenToClick) >= 20 ? "default" : "secondary"} className="text-xs shrink-0">
                    Target: 20%
                  </Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs sm:text-sm min-w-0">Click → Trial</span>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <span className="text-xs sm:text-sm font-medium">{overview.clickToTrial}%</span>
                  <Badge variant={parseFloat(overview.clickToTrial) >= 20 ? "default" : "secondary"} className="text-xs shrink-0">
                    Target: 20%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs sm:text-sm min-w-0">Trial → Paid</span>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <span className="text-xs sm:text-sm font-medium">{overview.trialToPaid}%</span>
                  <Badge variant={parseFloat(overview.trialToPaid) >= 15 ? "default" : "secondary"} className="text-xs shrink-0">
                    Target: 15%
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
