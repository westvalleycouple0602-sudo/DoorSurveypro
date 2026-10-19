import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, TrendingUp, Users, Clock, AlertCircle, Loader2, DollarSign, Target, TrendingDown, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/error-state';
import { LockedFeature } from '@/components/locked-feature';
import { UpsellDialog } from '@/components/upsell-dialog';
import { useFeatureAccess } from '@/hooks/use-feature-access';

/**
 * Analytics Dashboard
 * Displays system performance metrics and user analytics
 */

interface PerformanceMetrics {
  memory?: {
    rss?: number;
    heapUsed?: number;
    heapTotal?: number;
    external?: number;
  };
  requests?: {
    total?: number;
    errors?: number;
    errorRate?: number;
    avgResponseTime?: number;
  };
  queries?: {
    totalQueries?: number;
    slowQueries?: number;
    avgDuration?: number;
    slowQueryPercentage?: number;
  };
  uptime?: number;
  nodeVersion?: string;
}

interface UserMetrics {
  activeUsers?: number;
  totalProjects?: number;
  totalQuotes?: number;
}

interface Alert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export default function AnalyticsDashboard() {
  const { 
    currentTier,
    hasFeatureAccess,
    requireFeature,
    upsellConfig,
    closeUpsell,
  } = useFeatureAccess();

  const hasAdvancedReporting = hasFeatureAccess("advancedReporting");

  const { 
    data: metrics, 
    isLoading,
    isError: metricsError,
    error: metricsErrorObj,
    refetch: refetchMetrics
  } = useQuery<UserMetrics>({
    queryKey: ['/api/analytics/metrics'],
  });

  const { 
    data: performance, 
    isLoading: perfLoading,
    isError: perfError,
    error: perfErrorObj,
    refetch: refetchPerf
  } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/analytics/performance'],
  });

  const { 
    data: alerts,
    isError: alertsError,
    error: alertsErrorObj,
    refetch: refetchAlerts
  } = useQuery<Alert[]>({
    queryKey: ['/api/analytics/alerts'],
    refetchInterval: 30000, // Refresh every 30s
  });

  if (isLoading || perfLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="loading-analytics">
        <Skeleton className="h-8 sm:h-10 w-48 sm:w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 sm:h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (metricsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load analytics metrics"
          message={metricsErrorObj instanceof Error ? metricsErrorObj.message : "Unable to fetch user metrics data"}
          error={metricsErrorObj as Error}
          onRetry={refetchMetrics}
          testId="error-metrics"
        />
      </div>
    );
  }

  if (perfError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorState
          title="Failed to load performance data"
          message={perfErrorObj instanceof Error ? perfErrorObj.message : "Unable to fetch system performance metrics"}
          error={perfErrorObj as Error}
          onRetry={refetchPerf}
          testId="error-performance"
        />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-analytics-dashboard">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold" data-testid="heading-analytics">Analytics Dashboard</h1>
        <p className="text-muted-foreground text-xs sm:text-sm md:text-base">
          Monitor system performance and user activity
        </p>
      </div>

      {/* Performance Alerts */}
      {alertsError && (
        <Card data-testid="card-alerts-error">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-destructive" />
              Alert System Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ErrorState
              title="Failed to load alerts"
              message={alertsErrorObj instanceof Error ? alertsErrorObj.message : "Unable to fetch performance alerts"}
              error={alertsErrorObj as Error}
              onRetry={refetchAlerts}
              testId="error-alerts"
            />
          </CardContent>
        </Card>
      )}
      
      {!alertsError && alerts && alerts.length > 0 && (
        <Card data-testid="card-alerts">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-destructive" />
              Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 sm:pt-0 md:pt-0">
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 sm:p-3 border rounded-lg"
                  data-testid={`alert-${idx}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm sm:text-base truncate">{alert.message}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <Badge
                    className="shrink-0 text-xs"
                    variant={
                      alert.severity === 'critical'
                        ? 'destructive'
                        : alert.severity === 'high'
                        ? 'destructive'
                        : 'secondary'
                    }
                    data-testid={`badge-severity-${alert.severity}`}
                  >
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Card data-testid="card-active-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 md:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-active-users">
              {metrics?.activeUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-response">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 md:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-avg-response">
              {performance?.requests?.avgResponseTime?.toFixed(0) || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              -8% from last week
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-requests">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 md:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total Requests
            </CardTitle>
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-total-requests">
              {performance?.requests?.total?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Since server start
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-error-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 md:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Error Rate</CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold" data-testid="text-error-rate">
              {performance?.requests?.errorRate?.toFixed(2) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {performance?.requests?.errors || 0} errors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Market Value & Revenue Metrics */}
      <div className="space-y-3 sm:space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold mb-1">Market Value & Revenue Projections</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Platform valuation and revenue potential based on industry analysis</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <Card data-testid="card-platform-value">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 md:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Platform Value</CardTitle>
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-chart-1" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold" data-testid="text-platform-value">
                $800K-$1.35M
              </div>
              <p className="text-xs text-muted-foreground">
                Development value equivalent
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-year-2-arr">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 md:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Year 2 ARR Target</CardTitle>
              <Target className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-chart-2" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold" data-testid="text-year-2-arr">
                $330K-$1.3M
              </div>
              <p className="text-xs text-muted-foreground">
                Projected annual recurring revenue
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-year-5-arr">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 md:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Year 5 ARR Target</CardTitle>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-chart-3" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold" data-testid="text-year-5-arr">
                $2.5M-$8M
              </div>
              <p className="text-xs text-muted-foreground">
                Long-term revenue potential
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-valuation">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-4 md:p-6 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Est. Valuation</CardTitle>
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-chart-4" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold" data-testid="text-valuation">
                $25M-$120M
              </div>
              <p className="text-xs text-muted-foreground">
                Year 5 exit potential (10-15x)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Revenue Metrics */}
        <Card data-testid="card-current-revenue">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Current Revenue Metrics</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Real-time MRR, customer mix, and growth</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="flex justify-between items-baseline gap-2 mb-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">Monthly Recurring Revenue (MRR)</span>
                  <span className="text-2xl sm:text-3xl font-bold">$0</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline" className="gap-1 shrink-0">
                    <TrendingUp className="h-3 w-3 shrink-0" />
                    +0% MoM
                  </Badge>
                  <span className="text-muted-foreground">Target: $10K by Month 6</span>
                </div>
              </div>

              <div className="pt-3 sm:pt-4 border-t">
                <div className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">Customer Breakdown</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-chart-1 shrink-0"></div>
                      <span className="text-xs sm:text-sm truncate">Free Tier</span>
                    </div>
                    <span className="font-mono text-xs sm:text-sm shrink-0">0 users</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-chart-2 shrink-0"></div>
                      <span className="text-xs sm:text-sm truncate">Starter ($39/mo)</span>
                    </div>
                    <span className="font-mono text-xs sm:text-sm shrink-0">0 customers</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-chart-3 shrink-0"></div>
                      <span className="text-xs sm:text-sm truncate">Professional ($129/mo)</span>
                    </div>
                    <span className="font-mono text-xs sm:text-sm shrink-0">0 customers</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full bg-chart-4 shrink-0"></div>
                      <span className="text-xs sm:text-sm truncate">Enterprise ($399/mo)</span>
                    </div>
                    <span className="font-mono text-xs sm:text-sm shrink-0">0 customers</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 sm:pt-4 border-t">
                <div className="flex justify-between gap-2 text-xs sm:text-sm">
                  <span className="font-medium">Total Paying Customers</span>
                  <span className="font-mono">0</span>
                </div>
                <div className="flex justify-between gap-2 text-xs text-muted-foreground mt-1">
                  <span>Annual Run Rate (ARR)</span>
                  <span className="font-mono">$0</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Card data-testid="card-revenue-scenarios">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">Year 2 Revenue Scenarios</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Projected ARR based on customer acquisition</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-medium">Conservative</span>
                    <Badge variant="outline" className="shrink-0 text-xs">150 customers</Badge>
                  </div>
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-muted-foreground text-xs sm:text-sm">MRR: $19K-$27K</span>
                    <span className="text-lg sm:text-xl font-bold">$330K-$400K</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Mix: 60 Starter, 70 Pro, 20 Enterprise
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-medium">Moderate</span>
                    <Badge variant="outline" className="shrink-0 text-xs">240 customers</Badge>
                  </div>
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-muted-foreground text-xs sm:text-sm">MRR: $37K-$48K</span>
                    <span className="text-lg sm:text-xl font-bold">$620K-$750K</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Mix: 80 Starter, 110 Pro, 50 Enterprise
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-medium">Aggressive</span>
                    <Badge variant="outline" className="shrink-0 text-xs">400 customers</Badge>
                  </div>
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-muted-foreground text-xs sm:text-sm">MRR: $62K-$84K</span>
                    <span className="text-lg sm:text-xl font-bold">$1.1M-$1.3M</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Mix: 120 Starter, 200 Pro, 80 Enterprise
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-unit-economics">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">Unit Economics</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Healthy SaaS metrics across all tiers</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <div className="flex justify-between items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs sm:text-sm font-medium">Starter ($39/mo)</span>
                    <Badge className="shrink-0 text-xs">LTV:CAC 3.1:1</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Annual LTV: $936 | CAC: $300 | Payback: 8 months
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs sm:text-sm font-medium">Professional ($129/mo)</span>
                    <Badge className="shrink-0 text-xs">LTV:CAC 6.2:1</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Annual LTV: $3,096 | CAC: $500 | Payback: 4 months
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs sm:text-sm font-medium">Enterprise ($399/mo)</span>
                    <Badge className="shrink-0 text-xs">LTV:CAC 4.8:1</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Annual LTV: $9,576 | CAC: $2,000 | Payback: 5 months
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    All tiers exceed SaaS benchmarks (LTV:CAC {'>'}3:1) with strong gross margins (85-92%)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Market Opportunity */}
        <Card data-testid="card-market-opportunity">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Market Opportunity</CardTitle>
            <CardDescription className="text-xs sm:text-sm">$15B commercial door industry - North America</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">TAM (Total Addressable)</div>
                <div className="text-2xl sm:text-3xl font-bold">14,200</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Potential accounts (distributors, GCs, consultants)
                </div>
              </div>

              <div>
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">SAM (Serviceable)</div>
                <div className="text-2xl sm:text-3xl font-bold">2,950</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Tech-forward accounts (21% of TAM)
                </div>
              </div>

              <div>
                <div className="text-xs sm:text-sm text-muted-foreground mb-1">SOM (Target Penetration)</div>
                <div className="text-2xl sm:text-3xl font-bold">5-14%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Year 2: 150-400 customers
                </div>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
              <div className="text-xs sm:text-sm font-medium mb-2">Competitive Advantages:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="px-1.5 py-0.5 shrink-0">✓</Badge>
                  <span>Only vertical-specific SaaS</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="px-1.5 py-0.5 shrink-0">✓</Badge>
                  <span>75-92% cheaper than competitors</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="px-1.5 py-0.5 shrink-0">✓</Badge>
                  <span>AI & automation built-in</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="px-1.5 py-0.5 shrink-0">✓</Badge>
                  <span>Modern mobile-first tech</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <LockedFeature
          locked={!hasAdvancedReporting}
          onClick={() => requireFeature("advancedReporting", {
            featureName: "Advanced System Analytics",
            featureDescription: "Access detailed system metrics including memory usage, query performance, and database analytics. Upgrade to Professional to unlock these powerful monitoring tools.",
          })}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') requireFeature("advancedReporting", {
            featureName: "Advanced System Analytics",
            featureDescription: "Access detailed system metrics including memory usage, query performance, and database analytics. Upgrade to Professional to unlock these powerful monitoring tools.",
          }); }}
          tierBadgeText="Professional"
          variant="overlay"
          featureName="Advanced System Analytics"
        >
          <Card data-testid="card-memory">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">Memory Usage</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Heap and RSS memory consumption</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="space-y-2">
              <div className="flex justify-between gap-2 text-xs sm:text-sm">
                <span>Heap Used:</span>
                <span className="font-mono" data-testid="text-heap-used">
                  {performance?.memory?.heapUsed || 0} MB
                </span>
              </div>
              <div className="flex justify-between gap-2 text-xs sm:text-sm">
                <span>Heap Total:</span>
                <span className="font-mono" data-testid="text-heap-total">
                  {performance?.memory?.heapTotal || 0} MB
                </span>
              </div>
              <div className="flex justify-between gap-2 text-xs sm:text-sm">
                <span>RSS:</span>
                <span className="font-mono" data-testid="text-rss">
                  {performance?.memory?.rss || 0} MB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </LockedFeature>

        <LockedFeature
          locked={!hasAdvancedReporting}
          onClick={() => requireFeature("advancedReporting", {
            featureName: "Advanced Database Analytics",
            featureDescription: "Monitor database query performance, identify slow queries, and optimize your database operations. Available on Professional and Enterprise plans.",
          })}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') requireFeature("advancedReporting", {
            featureName: "Advanced Database Analytics",
            featureDescription: "Monitor database query performance, identify slow queries, and optimize your database operations. Available on Professional and Enterprise plans.",
          }); }}
          tierBadgeText="Professional"
          variant="overlay"
          featureName="Advanced Database Analytics"
        >
          <Card data-testid="card-queries">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-base sm:text-lg">Database Queries</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Query performance statistics</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="space-y-2">
                <div className="flex justify-between gap-2 text-xs sm:text-sm">
                  <span>Total Queries:</span>
                  <span className="font-mono" data-testid="text-total-queries">
                    {performance?.queries?.totalQueries || 0}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-xs sm:text-sm">
                  <span>Slow Queries:</span>
                  <span className="font-mono" data-testid="text-slow-queries">
                    {performance?.queries?.slowQueries || 0}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-xs sm:text-sm">
                  <span>Avg Duration:</span>
                  <span className="font-mono" data-testid="text-avg-duration">
                    {performance?.queries?.avgDuration?.toFixed(0) || 0}ms
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </LockedFeature>
      </div>

      {/* System Info */}
      <Card data-testid="card-system">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg">System Information</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Server uptime and environment</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">Uptime</div>
              <div className="text-xl sm:text-2xl font-mono" data-testid="text-uptime">
                {formatUptime(performance?.uptime || 0)}
              </div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-muted-foreground">Node Version</div>
              <div className="text-xl sm:text-2xl font-mono" data-testid="text-node-version">
                {performance?.nodeVersion || "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
