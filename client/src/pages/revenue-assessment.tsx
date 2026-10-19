import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  FolderOpen,
  DoorOpen,
  Gauge,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CreditCard,
  Target,
  Activity,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface RevenueData {
  overview: {
    totalOrganizations: number;
    totalUsers: number;
    totalProjects: number;
    totalOpenings: number;
    paidOrganizations: number;
    trialOrganizations: number;
    stripeConnectedOrgs: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    avgRevenuePerOrg: number;
    avgRevenuePerPaidOrg: number;
    conversionRate: number;
    tierBreakdown: Record<string, number>;
    planPricing: Record<string, number>;
  };
  growth: {
    orgGrowthRate: number;
    userGrowthRate: number;
    projectGrowthRate: number;
    newOrgsLast30Days: number;
    newUsersLast30Days: number;
    newProjectsLast30Days: number;
  };
  engagement: {
    usersPerOrg: number;
    projectsPerOrg: number;
    openingsPerProject: number;
  };
  valuation: {
    estimatedValuation: number;
    revenueMultiple: number;
    saasScore: number;
    methodology: string;
  };
  monthlyTrend: {
    month: string;
    orgs: number;
    users: number;
    projects: number;
    revenue: number;
  }[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

function GrowthIndicator({ rate, label }: { rate: number; label: string }) {
  const isPositive = rate > 0;
  const isNeutral = rate === 0;
  const Icon = isPositive ? ArrowUpRight : isNeutral ? Minus : ArrowDownRight;

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${isPositive ? "text-green-600 dark:text-green-400" : isNeutral ? "text-muted-foreground" : "text-red-600 dark:text-red-400"}`} />
      <span className={`text-sm font-medium ${isPositive ? "text-green-600 dark:text-green-400" : isNeutral ? "text-muted-foreground" : "text-red-600 dark:text-red-400"}`}>
        {isPositive ? "+" : ""}{rate}%
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function SaaSScoreGauge({ score }: { score: number }) {
  let tier: string;
  let tierColor: string;
  if (score >= 80) {
    tier = "Excellent";
    tierColor = "text-green-600 dark:text-green-400";
  } else if (score >= 60) {
    tier = "Strong";
    tierColor = "text-blue-600 dark:text-blue-400";
  } else if (score >= 40) {
    tier = "Growing";
    tierColor = "text-yellow-600 dark:text-yellow-400";
  } else if (score >= 20) {
    tier = "Early Stage";
    tierColor = "text-orange-600 dark:text-orange-400";
  } else {
    tier = "Pre-Revenue";
    tierColor = "text-muted-foreground";
  }

  return (
    <div className="flex flex-col items-center gap-3" data-testid="gauge-saas-score">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${score * 2.64} ${264 - score * 2.64}`}
            strokeLinecap="round"
            className={tierColor}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" data-testid="text-saas-score">{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <div className="text-center">
        <Badge variant="outline" className={`${tierColor}`} data-testid="badge-saas-tier">
          {tier}
        </Badge>
      </div>
    </div>
  );
}

function TierBreakdownBar({ breakdown, pricing }: { breakdown: Record<string, number>; pricing: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const tierColors: Record<string, string> = {
    free: "bg-gray-400 dark:bg-gray-600",
    starter: "bg-blue-400 dark:bg-blue-600",
    professional: "bg-indigo-500 dark:bg-indigo-600",
    pro: "bg-indigo-500 dark:bg-indigo-600",
    enterprise: "bg-purple-500 dark:bg-purple-600",
    custom: "bg-amber-500 dark:bg-amber-600",
  };

  return (
    <div className="space-y-3" data-testid="chart-tier-breakdown">
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {Object.entries(breakdown).map(([tier, count]) => (
          <div
            key={tier}
            className={`${tierColors[tier] || "bg-muted"} transition-all`}
            style={{ width: `${(count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(breakdown).map(([tier, count]) => (
          <div key={tier} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${tierColors[tier] || "bg-muted"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-medium capitalize">{tier}</span>
              <span className="text-xs text-muted-foreground">
                {count} org{count !== 1 ? "s" : ""} @ ${pricing[tier] || 0}/mo
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniTrendChart({ data, dataKey }: { data: { month: string; [key: string]: any }[]; dataKey: string }) {
  if (!data || data.length === 0) return null;

  const values = data.map((d) => d[dataKey] as number);
  const max = Math.max(...values, 1);
  const height = 40;

  return (
    <div className="flex items-end gap-1 h-10" data-testid={`chart-trend-${dataKey}`}>
      {values.map((val, i) => (
        <div
          key={i}
          className="flex-1 bg-primary/20 dark:bg-primary/30 rounded-t-sm min-w-[4px] transition-all"
          style={{ height: `${Math.max((val / max) * height, 2)}px` }}
          title={`${data[i].month}: ${dataKey === "revenue" ? formatCurrency(val) : val}`}
        />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="p-3 sm:p-4 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent><Skeleton className="h-32 w-32 mx-auto rounded-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RevenueAssessment() {
  const { data, isLoading, error, isError } = useQuery<RevenueData>({
    queryKey: ["/api/revenue-assessment"],
  });

  if (isLoading) {
    return (
      <div className="container max-w-7xl px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2" data-testid="heading-revenue-assessment">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            Revenue Assessment
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Estimated application value and SaaS metrics</p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (isError) return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">Failed to load data. Please refresh the page.</p>
      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh</Button>
    </div>
  );

  if (error || !data) {
    return (
      <div className="container max-w-7xl px-4 sm:px-6 py-4 sm:py-6">
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          Revenue Assessment
        </h1>
        <Card className="mt-4">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Failed to load revenue assessment data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2" data-testid="heading-revenue-assessment">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <span className="truncate">Revenue Assessment</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Estimated application value and SaaS business metrics
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <Badge variant="default" className="gap-1">
            <Gauge className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="text-xs">Business Valuation</span>
          </Badge>
        </div>
      </div>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent" data-testid="card-valuation-hero">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estimated Application Value</p>
              <p className="text-3xl sm:text-4xl font-bold" data-testid="text-estimated-valuation">
                {formatCurrency(data.valuation.estimatedValuation)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on {data.valuation.revenueMultiple}x ARR multiple ({data.valuation.methodology})
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">MRR</p>
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-mrr">{formatCurrency(data.revenue.mrr)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">ARR</p>
                <p className="text-xl sm:text-2xl font-bold" data-testid="text-arr">{formatCurrency(data.revenue.arr)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card data-testid="stat-total-orgs">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-xs sm:text-sm">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Organizations</span>
            </CardDescription>
            <CardTitle className="text-xl sm:text-3xl">{formatNumber(data.overview.totalOrganizations)}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <GrowthIndicator rate={data.growth.orgGrowthRate} label="30d" />
          </CardContent>
        </Card>

        <Card data-testid="stat-total-users">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Total Users</span>
            </CardDescription>
            <CardTitle className="text-xl sm:text-3xl">{formatNumber(data.overview.totalUsers)}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <GrowthIndicator rate={data.growth.userGrowthRate} label="30d" />
          </CardContent>
        </Card>

        <Card data-testid="stat-total-projects">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-xs sm:text-sm">
              <FolderOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Projects</span>
            </CardDescription>
            <CardTitle className="text-xl sm:text-3xl">{formatNumber(data.overview.totalProjects)}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <GrowthIndicator rate={data.growth.projectGrowthRate} label="30d" />
          </CardContent>
        </Card>

        <Card data-testid="stat-total-openings">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardDescription className="flex items-center gap-1 text-xs sm:text-sm">
              <DoorOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Door Openings</span>
            </CardDescription>
            <CardTitle className="text-xl sm:text-3xl">{formatNumber(data.overview.totalOpenings)}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xs text-muted-foreground">
              {data.engagement.openingsPerProject} avg per project
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
        <Card data-testid="card-saas-score">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              SaaS Health Score
            </CardTitle>
            <CardDescription className="text-xs">Composite score based on revenue, growth, and engagement</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-2 flex justify-center">
            <SaaSScoreGauge score={data.valuation.saasScore} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-tier-breakdown">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Subscription Tiers
            </CardTitle>
            <CardDescription className="text-xs">Distribution of organizations across pricing plans</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-2 space-y-4">
            <TierBreakdownBar breakdown={data.revenue.tierBreakdown} pricing={data.revenue.planPricing} />
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Paid Orgs</p>
                <p className="text-lg font-bold" data-testid="text-paid-orgs">{data.overview.paidOrganizations}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-lg font-bold" data-testid="text-conversion-rate">{data.revenue.conversionRate}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ARPU (paid)</p>
                <p className="text-lg font-bold" data-testid="text-arpu">{formatCurrency(data.revenue.avgRevenuePerPaidOrg)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card data-testid="card-growth-metrics">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Growth Metrics
            </CardTitle>
            <CardDescription className="text-xs">30-day growth compared to prior period</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-2 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">New Organizations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" data-testid="text-new-orgs">{data.growth.newOrgsLast30Days}</span>
                  <GrowthIndicator rate={data.growth.orgGrowthRate} label="" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">New Users</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" data-testid="text-new-users">{data.growth.newUsersLast30Days}</span>
                  <GrowthIndicator rate={data.growth.userGrowthRate} label="" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">New Projects</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" data-testid="text-new-projects">{data.growth.newProjectsLast30Days}</span>
                  <GrowthIndicator rate={data.growth.projectGrowthRate} label="" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-engagement">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Engagement Metrics
            </CardTitle>
            <CardDescription className="text-xs">Platform utilization and depth of use</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-2 space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Users per Organization</span>
                  <span className="text-sm font-medium" data-testid="text-users-per-org">{data.engagement.usersPerOrg}</span>
                </div>
                <Progress value={Math.min(data.engagement.usersPerOrg * 10, 100)} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Projects per Organization</span>
                  <span className="text-sm font-medium" data-testid="text-projects-per-org">{data.engagement.projectsPerOrg}</span>
                </div>
                <Progress value={Math.min(data.engagement.projectsPerOrg * 5, 100)} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Openings per Project</span>
                  <span className="text-sm font-medium" data-testid="text-openings-per-project">{data.engagement.openingsPerProject}</span>
                </div>
                <Progress value={Math.min(data.engagement.openingsPerProject * 5, 100)} className="h-1.5" />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Stripe Connected</p>
                <p className="text-lg font-bold flex items-center gap-1" data-testid="text-stripe-connected">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  {data.overview.stripeConnectedOrgs}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">In Trial</p>
                <p className="text-lg font-bold" data-testid="text-trial-orgs">{data.overview.trialOrganizations}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-monthly-trends">
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            6-Month Trends
          </CardTitle>
          <CardDescription className="text-xs">Cumulative growth across key metrics</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Revenue
              </p>
              <MiniTrendChart data={data.monthlyTrend} dataKey="revenue" />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{data.monthlyTrend[0]?.month}</span>
                <span className="text-[10px] text-muted-foreground">{data.monthlyTrend[data.monthlyTrend.length - 1]?.month}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Organizations
              </p>
              <MiniTrendChart data={data.monthlyTrend} dataKey="orgs" />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{data.monthlyTrend[0]?.month}</span>
                <span className="text-[10px] text-muted-foreground">{data.monthlyTrend[data.monthlyTrend.length - 1]?.month}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" /> Users
              </p>
              <MiniTrendChart data={data.monthlyTrend} dataKey="users" />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{data.monthlyTrend[0]?.month}</span>
                <span className="text-[10px] text-muted-foreground">{data.monthlyTrend[data.monthlyTrend.length - 1]?.month}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <FolderOpen className="h-3 w-3" /> Projects
              </p>
              <MiniTrendChart data={data.monthlyTrend} dataKey="projects" />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{data.monthlyTrend[0]?.month}</span>
                <span className="text-[10px] text-muted-foreground">{data.monthlyTrend[data.monthlyTrend.length - 1]?.month}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-valuation-factors">
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Valuation Factors
          </CardTitle>
          <CardDescription className="text-xs">Key drivers influencing the estimated application value</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Revenue Multiple</p>
              <p className="text-2xl font-bold" data-testid="text-revenue-multiple">{data.valuation.revenueMultiple}x</p>
              <p className="text-xs text-muted-foreground">Applied to ARR</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Annual Recurring Revenue</p>
              <p className="text-2xl font-bold" data-testid="text-arr-factor">{formatCurrency(data.revenue.arr)}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(data.revenue.mrr)} MRR x 12</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Growth Rate</p>
              <p className="text-2xl font-bold flex items-center gap-1" data-testid="text-growth-factor">
                {data.growth.orgGrowthRate > 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                {data.growth.orgGrowthRate}%
              </p>
              <p className="text-xs text-muted-foreground">Org growth (30d)</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Market Position</p>
              <p className="text-2xl font-bold" data-testid="text-market-position">Vertical SaaS</p>
              <p className="text-xs text-muted-foreground">Commercial door industry</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
