import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, FolderOpen, DoorOpen, Clock, Camera, FileText, 
  ClipboardList, DollarSign, UserPlus, Upload, BarChart3,
  CheckCircle2, ArrowRight, Lightbulb, Ruler, Quote, Building, DoorClosed,
  Package, Shield, Wrench, TrendingUp, Zap, CreditCard, Users, Sparkles, Rocket
} from "lucide-react";
import { Link } from "wouter";
import type { Project, DoorOpening } from "@shared/schema";
import { useRecentProjects } from "@/hooks/use-recent-projects";
import { formatDistanceToNow } from "date-fns";
import { ErrorState } from "@/components/error-state";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import { MetricCard } from "@/components/metric-card";
import { StatsCardSkeleton } from "@/components/ui/skeletons";
import { ProjectTrendsChart } from "@/components/charts/project-trends-chart";
import { DistributionChart } from "@/components/charts/distribution-chart";
import { ActivityTimeline } from "@/components/charts/activity-timeline";
import { TrialStatusBanner } from "@/components/trial-status-banner";
import { GettingStartedCard, useGettingStartedProgress } from "@/components/getting-started-wizard";
import { useMemo } from "react";

interface DashboardSummary {
  projects: Project[];
  openings: DoorOpening[];
  photos: any[];
  quoteRequests: any[];
}

interface DashboardAnalytics {
  metrics: {
    activeProjects: number;
    completedProjects: number;
    totalOpenings: number;
    totalPhotos: number;
    trends: {
      projects: number;
      openings: number;
    };
  };
  charts: {
    projectTrends: Array<{ date: string; count: number }>;
    statusDistribution: Array<{ status: string; count: number }>;
    buildingTypes: Array<{ type: string; count: number }>;
    doorTypes: Array<{ type: string; count: number }>;
  };
  activities: Array<{
    type: 'project_created' | 'opening_added';
    title: string;
    timestamp: Date;
    metadata: Record<string, any>;
  }>;
}

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { getRecentProjects } = useRecentProjects();
  
  // Fetch summary and analytics concurrently
  const { data, isLoading, isError, error, refetch } = useQuery<DashboardSummary>({
    queryKey: ["/api/dashboard/summary"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<DashboardAnalytics>({
    queryKey: ["/api/dashboard/analytics"],
  });

  const projects = data?.projects || [];
  const openings = data?.openings || [];
  const photos = data?.photos || [];
  const quoteRequests = data?.quoteRequests || [];

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;
  const draftProjects = projects.filter((p) => p.status === "draft").length;
  const totalOpenings = openings.length;
  const totalPhotos = photos.length;
  const pendingQuotes = quoteRequests.filter((q: any) => q.status === "pending").length;

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  
  const recentlyViewed = getRecentProjects();

  // Get getting started progress for conditional rendering
  const { progress: gettingStartedProgress } = useGettingStartedProgress();
  const gettingStartedStepsComplete = Object.values(gettingStartedProgress).filter(Boolean).length;
  const isSetupComplete = gettingStartedStepsComplete >= 5;

  // Determine if user is new (no projects)
  const isNewUser = projects.length === 0;

  // Show error state
  if (isError) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <ErrorState
            title="Failed to load dashboard"
            message={error instanceof Error ? error.message : "Unable to fetch dashboard data. Please check your connection and try again."}
            error={error as Error}
            onRetry={refetch}
            testId="error-dashboard"
            fullPage
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        <section className="dsp-field-hero" aria-labelledby="field-workspace-heading">
          <p className="dsp-field-eyebrow">Division 8 field survey</p>
          <h1 id="field-workspace-heading">Your field workspace</h1>
          <p className="dsp-field-intro">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}. Keep each opening's evidence,
            measurements and project work together.
          </p>
          <ol className="dsp-field-steps" aria-label="Survey workflow">
            <li><b aria-hidden="true">01</b><div><strong>Register the opening</strong><span>Project, location, door and frame.</span></div></li>
            <li><b aria-hidden="true">02</b><div><strong>Capture the evidence</strong><span>Photos, observations and measurements.</span></div></li>
            <li><b aria-hidden="true">03</b><div><strong>Review and deliver</strong><span>Verify details, prepare scope and export.</span></div></li>
          </ol>
        </section>

        {/* Trial Status Banner */}
        <TrialStatusBanner />

        {/* Getting Started Card - shown for users who haven't completed setup */}
        {!isSetupComplete && !isLoading && (
          <GettingStartedCard className="animate-fade-in-up" />
        )}

        {/* Subscription Status Card */}
        {user?.organization && (
          <Card className="border-l-4 border-l-primary animate-fade-in-up" data-testid="card-subscription-status">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="rounded-lg bg-primary/10 p-2 sm:p-2.5 shrink-0">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-medium text-sm sm:text-base">Current Plan:</span>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {user.organization.subscriptionTier === 'starter' ? 'Starter / Solo'
                          : user.organization.subscriptionTier === 'professional' ? 'Professional / Team'
                          : user.organization.subscriptionTier === 'enterprise' ? 'Enterprise / Integration'
                          : user.organization.subscriptionTier === 'master' ? 'Master Account'
                          : user.organization.subscriptionTier || 'Free'}
                      </Badge>
                      {user.organization.subscriptionStatus === 'active' && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300 dark:text-green-400 dark:border-green-700">
                          Active
                        </Badge>
                      )}
                      {user.organization.subscriptionStatus === 'trialing' && (
                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700">
                          Trial
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {user.organization.subscriptionTier === 'enterprise' || user.organization.subscriptionTier === 'master'
                        ? 'Unlimited projects, users, and all features'
                        : user.organization.subscriptionTier === 'professional'
                        ? 'Unlimited projects, up to 10 users'
                        : user.organization.subscriptionTier === 'starter'
                        ? '5 projects, 1 user, 10 scans/day'
                        : '3 projects, 1 user, 5 scans/day'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!user.organization.subscriptionTier || user.organization.subscriptionTier === 'free' || user.organization.subscriptionTier === 'starter' ? (
                    <Link href="/settings/subscription">
                      <Button size="sm" data-testid="button-upgrade-plan">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Upgrade Plan
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/billing">
                      <Button variant="outline" size="sm" data-testid="button-manage-billing">
                        Manage Billing
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Getting Started - compact progress card for new users */}
        {data && isNewUser && !isLoading && (
          <Card className="border-primary/20 bg-primary/5 animate-fade-in-up" data-testid="card-getting-started">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <Rocket className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base" data-testid="text-getting-started-title">
                      Ready to start surveying?
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Create your first project to begin capturing door openings, measurements, and hardware data.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href="/getting-started">
                    <Button variant="outline" size="sm" data-testid="button-setup-guide">
                      <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                      Setup Guide
                    </Button>
                  </Link>
                  <Link href="/projects/new">
                    <Button size="sm" data-testid="button-guide-new-project">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      New Project
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feature Banners - Interactive Category Links */}
        {isAuthenticated ? (
          <div className="space-y-3 sm:space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-semibold">Explore Features</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Quick access to key platform areas</p>
              </div>
            </div>

          {/* Primary Feature Banners */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {/* Projects Banner */}
            <Link href="/projects" className="stagger-item group" data-testid="banner-projects">
              <Card className="border-2 hover-elevate active-elevate-2 transition-all cursor-pointer h-full">
                <div className="relative p-4 sm:p-6 bg-gradient-to-br from-chart-1/10 via-chart-1/5 to-transparent rounded-lg overflow-hidden">
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <FolderOpen className="h-12 w-12 sm:h-16 sm:w-16 text-chart-1" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="rounded-lg bg-chart-1/20 p-2 sm:p-2.5 shrink-0">
                        <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6 text-chart-1" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold leading-tight">Projects</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed">
                      Manage door survey projects and track progress across all sites
                    </p>
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-chart-1">
                      <span>View All Projects</span>
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Hardware Catalog Banner */}
            <Link href="/catalog" className="stagger-item group" data-testid="banner-catalog">
              <Card className="border-2 hover-elevate active-elevate-2 transition-all cursor-pointer h-full">
                <div className="relative p-4 sm:p-6 bg-gradient-to-br from-chart-2/10 via-chart-2/5 to-transparent rounded-lg overflow-hidden">
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Package className="h-12 w-12 sm:h-16 sm:w-16 text-chart-2" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="rounded-lg bg-chart-2/20 p-2 sm:p-2.5 shrink-0">
                        <Package className="h-5 w-5 sm:h-6 sm:w-6 text-chart-2" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold leading-tight">Hardware Catalog</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed">
                      Browse 10,000+ door hardware products with specs and pricing
                    </p>
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-chart-2">
                      <span>Browse Catalog</span>
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Compliance Validation Banner */}
            <Link href="/compliance-validation" className="stagger-item group" data-testid="banner-compliance">
              <Card className="border-2 hover-elevate active-elevate-2 transition-all cursor-pointer h-full">
                <div className="relative p-4 sm:p-6 bg-gradient-to-br from-chart-3/10 via-chart-3/5 to-transparent rounded-lg overflow-hidden">
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Shield className="h-12 w-12 sm:h-16 sm:w-16 text-chart-3" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="rounded-lg bg-chart-3/20 p-2 sm:p-2.5 shrink-0">
                        <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-chart-3" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold leading-tight">Compliance</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed">
                      Real-time building code validation with AI-powered analysis
                    </p>
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-chart-3">
                      <span>Check Compliance</span>
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* Secondary Feature Banners */}
          <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {/* Reports Banner */}
            <Link href="/reports" className="stagger-item group" data-testid="banner-reports">
              <Card className="hover-elevate active-elevate-2 transition-all cursor-pointer h-full">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="rounded-lg bg-chart-4/10 p-2 shrink-0">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-chart-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs sm:text-sm leading-tight">Analytics & Reports</h4>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">
                        Business insights
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Integrations Banner */}
            <Link href="/integrations" className="stagger-item group" data-testid="banner-integrations">
              <Card className="hover-elevate active-elevate-2 transition-all cursor-pointer h-full">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="rounded-lg bg-chart-1/10 p-2 shrink-0">
                      <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-chart-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs sm:text-sm leading-tight">Integrations</h4>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">
                        Connect your tools
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Engineering Review Banner */}
            <Link href="/engineering-review" className="stagger-item group" data-testid="banner-engineering-review">
              <Card className="hover-elevate active-elevate-2 transition-all cursor-pointer h-full">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="rounded-lg bg-chart-2/10 p-2 shrink-0">
                      <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-chart-2" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs sm:text-sm leading-tight">Engineering Review</h4>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">
                        Review & tips
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Sales Pipeline Banner */}
            <Link href="/sales" className="stagger-item group" data-testid="banner-sales">
              <Card className="hover-elevate active-elevate-2 transition-all cursor-pointer h-full">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="rounded-lg bg-chart-3/10 p-2 shrink-0">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-chart-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs sm:text-sm leading-tight">Sales Pipeline</h4>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-tight">
                        Track opportunities
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Quick Action Buttons */}
          <Card data-testid="card-quick-actions">
            <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
                <Button variant="default" size="sm" asChild data-testid="button-quick-new-project" className="text-xs sm:text-sm">
                  <Link href="/projects/new">
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 shrink-0" />
                    <span className="truncate">New Project</span>
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild data-testid="button-quick-upload-data" className="text-xs sm:text-sm">
                  <Link href="/import">
                    <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 shrink-0" />
                    <span className="truncate">Import Data</span>
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild data-testid="button-quick-create-quote" className="text-xs sm:text-sm">
                  <Link href="/engineering-review">
                    <Quote className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 shrink-0" />
                    <span className="truncate">Create Quote</span>
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild data-testid="button-quick-add-customer" className="text-xs sm:text-sm">
                  <Link href="/customers">
                    <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 shrink-0" />
                    <span className="truncate">Add Customer</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>
        ) : authLoading ? (
          <Card className="animate-fade-in-up">
            <CardHeader className="p-3 sm:p-4">
              <Skeleton className="h-4 sm:h-5 w-28 sm:w-32" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 sm:p-6 rounded-lg border">
                    <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 mb-2 sm:mb-3" />
                    <Skeleton className="h-4 sm:h-5 w-28 sm:w-32 mb-1.5 sm:mb-2" />
                    <Skeleton className="h-10 sm:h-12 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Metrics Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <div className="stagger-item">
            <MetricCard
              title="Active Projects"
              value={activeProjects}
              subtitle="Currently in progress"
              icon={FolderOpen}
              iconColor="text-chart-1"
              isLoading={isLoading}
              testId="text-active-projects"
              trend={analytics?.metrics.trends.projects !== undefined ? {
                value: analytics.metrics.trends.projects,
                label: "vs last week",
                positive: analytics.metrics.trends.projects >= 0
              } : undefined}
            />
          </div>

          <div className="stagger-item">
            <MetricCard
              title="Total Openings"
              value={totalOpenings}
              subtitle="Door openings surveyed"
              icon={DoorOpen}
              iconColor="text-chart-2"
              isLoading={isLoading}
              testId="text-total-openings"
              trend={analytics?.metrics.trends.openings !== undefined ? {
                value: analytics.metrics.trends.openings,
                label: "vs last week",
                positive: analytics.metrics.trends.openings >= 0
              } : undefined}
            />
          </div>

          <div className="stagger-item">
            <MetricCard
              title="Photos Uploaded"
              value={totalPhotos}
              subtitle="Across all projects"
              icon={Camera}
              iconColor="text-chart-3"
              isLoading={isLoading}
              testId="text-total-photos"
            />
          </div>

          <div className="stagger-item">
            <MetricCard
              title="Pending Quotes"
              value={pendingQuotes}
              subtitle="Awaiting review"
              icon={FileText}
              iconColor="text-chart-4"
              isLoading={isLoading}
              testId="text-pending-quotes"
            />
          </div>
        </div>

        {/* Analytics Charts */}
        {!isNewUser && analytics && (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 animate-fade-in-up">
            {analytics.charts.projectTrends.length > 0 && (
              <div className="sm:col-span-2 xl:col-span-2">
                <ProjectTrendsChart data={analytics.charts.projectTrends} />
              </div>
            )}
            
            {analytics.charts.statusDistribution.length > 0 && (
              <DistributionChart
                data={analytics.charts.statusDistribution}
                title="Project Status"
                description="Distribution by status"
                icon={BarChart3}
                dataKey="status"
                testId="card-status-distribution"
              />
            )}
            
            {analytics.charts.buildingTypes.length > 0 && (
              <DistributionChart
                data={analytics.charts.buildingTypes}
                title="Building Types"
                description="Projects by building type"
                icon={Building}
                dataKey="type"
                testId="card-building-types"
              />
            )}
            
            {analytics.charts.doorTypes.length > 0 && (
              <DistributionChart
                data={analytics.charts.doorTypes}
                title="Door Types"
                description="Top door types used"
                icon={DoorClosed}
                dataKey="type"
                testId="card-door-types"
              />
            )}
            
            {analytics.activities.length > 0 && (
              <ActivityTimeline activities={analytics.activities} />
            )}
          </div>
        )}

        {/* Recently Viewed */}
            {recentlyViewed.length > 0 && (
          <Card>
            <CardHeader className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <CardTitle className="text-sm sm:text-base">Recently Viewed</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {recentlyViewed.map((item) => (
                  <Link key={item.id} href={`/projects/${item.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-recent-view-${item.id}`}
                    >
                      {item.name}
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Projects */}
        <Card>
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base">Recent Projects</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {isLoading ? (
              <div className="space-y-2 sm:space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 sm:p-4 rounded-md border">
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-3.5 sm:h-4 w-36 sm:w-48 mb-1.5 sm:mb-2" />
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Skeleton className="h-2.5 sm:h-3 w-20 sm:w-24" />
                        <Skeleton className="h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full shrink-0" />
                        <Skeleton className="h-2.5 sm:h-3 w-16 sm:w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-5 sm:h-6 w-14 sm:w-16 shrink-0" />
                  </div>
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <FolderOpen className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium mb-1">No projects yet</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  Create your first project to start surveying door openings
                </p>
                <Link href="/projects/new">
                  <Button data-testid="button-create-first-project">
                    <Plus className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
                    Create Project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {recentProjects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div
                      className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-md border hover-elevate active-elevate-2 transition-colors"
                      data-testid={`card-project-${project.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-xs sm:text-sm truncate">{project.name}</h4>
                        <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1">
                          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {project.location}
                          </span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">•</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground capitalize truncate">
                            {project.buildingType}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          className="text-[10px] sm:text-xs"
                          variant={
                            project.status === "active"
                              ? "default"
                              : project.status === "completed"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {project.status}
                        </Badge>
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

