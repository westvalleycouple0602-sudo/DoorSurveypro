import { useEffect, lazy, Suspense, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import { Router as WouterRouter, Redirect } from "wouter";
import { ClerkProviderWithRoutes, SignInPage, SignUpPage, basePath } from "@/components/clerk-provider";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { TourTrigger, useTour, PageHelpButton } from "@/components/guided-tour";
import { KeyboardShortcutsDialog } from "@/components/ui/keyboard-shortcuts-dialog";
import { GlobalSearch } from "@/components/global-search";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { QuickCreateMenu } from "@/components/quick-create-menu";
import { Loader2 } from "lucide-react";
const CommandPalette = lazy(() => import("@/components/ui/command-palette").then(m => ({ default: m.CommandPalette })));
const RecentItemsPanel = lazy(() => import("@/components/recent-items-panel").then(m => ({ default: m.RecentItemsPanel })));
const GuidedTour = lazy(() => import("@/components/guided-tour").then(m => ({ default: m.GuidedTour })));
const WelcomeDialog = lazy(() => import("@/components/welcome-dialog").then(m => ({ default: m.WelcomeDialog })));
const GettingStartedWizard = lazy(() => import("@/components/getting-started-wizard").then(m => ({ default: m.GettingStartedWizard })));

import { initRUM, updateUserContext } from "@/lib/rum";
import { initPostHog, trackPageView, identifyUser } from "@/lib/posthog";
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
// Core pages - eagerly loaded for critical app path only
// Keep only Dashboard and Projects list eager for fast initial load
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Projects = lazy(() => import("@/pages/projects"));
import NotFound from "@/pages/not-found";

// Project & Opening details - lazy load to reduce initial bundle
// These are large components (4k+ lines) and not needed until user navigates
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const OpeningDetail = lazy(() => import("@/pages/opening-detail"));

// Marketing & authentication - lazy loaded (not part of critical app path)
const Landing = lazy(() => import("@/pages/landing"));
const Demo = lazy(() => import("@/pages/demo"));
const Prelaunch = lazy(() => import("@/pages/prelaunch"));
const Pricing = lazy(() => import("@/pages/pricing"));

// Lazy load pages to reduce initial bundle size
// Category 1: Heavy dependencies (3D, OCR, AI)
const ArMeasurements = lazy(() => import("@/pages/ar-measurements"));
const ComputerVision = lazy(() => import("@/pages/computer-vision"));
const DocumentIntelligence = lazy(() => import("@/pages/document-intelligence"));
const LidarScans = lazy(() => import("@/pages/lidar-scans"));
const Reports = lazy(() => import("@/pages/reports"));
const HardwareSchedule = lazy(() => import("@/pages/hardware-schedule"));

// Category 2: Project management (less frequently accessed)
const NewProject = lazy(() => import("@/pages/new-project"));
const DuplicateProject = lazy(() => import("@/pages/duplicate-project"));
const NewOpening = lazy(() => import("@/pages/new-opening"));
const DoorSurvey = lazy(() => import("@/pages/door-survey"));
const Compliance = lazy(() => import("@/pages/compliance"));
const Costs = lazy(() => import("@/pages/costs"));
const FloorPlans = lazy(() => import("@/pages/floor-plans"));
const ScopeOfWork = lazy(() => import("@/pages/scope-of-work"));
const PmBoard = lazy(() => import("@/pages/pm-board"));
const Div28Assessments = lazy(() => import("@/pages/div28-assessments"));

// Category 3: Configuration & setup pages
const Templates = lazy(() => import("@/pages/templates"));
const Bundles = lazy(() => import("@/pages/bundles"));
const Catalog = lazy(() => import("@/pages/catalog"));
const Reference = lazy(() => import("@/pages/reference"));
const ReferenceLibrary = lazy(() => import("@/pages/reference-library"));
const CrossReference = lazy(() => import("@/pages/cross-reference"));
const CodeReference = lazy(() => import("@/pages/code-reference"));

// Category 4: Data management
const Import = lazy(() => import("@/pages/import"));
const Export = lazy(() => import("@/pages/export"));
const ExportProfiles = lazy(() => import("@/pages/ExportProfiles"));
const BulkImport = lazy(() => import("@/pages/bulk-import"));
const ProductCatalogImport = lazy(() => import("@/pages/product-catalog-import"));
const PdfCatalogImport = lazy(() => import("@/pages/pdf-catalog-import"));
const Manufacturers = lazy(() => import("@/pages/manufacturers"));
const Distributors = lazy(() => import("@/pages/distributors"));
const Customers = lazy(() => import("@/pages/customers"));

// Category 5: Financial & purchasing
const PurchaseOrders = lazy(() => import("@/pages/purchase-orders"));
const ChangeOrders = lazy(() => import("@/pages/change-orders"));
const Billing = lazy(() => import("@/pages/billing"));
const QuotePayment = lazy(() => import("@/pages/quote-payment"));
const QuotePaymentSuccess = lazy(() => import("@/pages/quote-payment-success"));

// Category 6: Specialized features
const EngineeringReview = lazy(() => import("@/pages/engineering-review"));
const Disclaimers = lazy(() => import("@/pages/disclaimers"));
const GasketingCatalog = lazy(() => import("@/pages/gasketing-catalog"));
const KeyingSystems = lazy(() => import("@/pages/keying-systems"));
const WiringDiagrams = lazy(() => import("@/pages/wiring-diagrams"));

// Category 7: Analytics & insights
const AnalyticsDashboard = lazy(() => import("@/pages/AnalyticsDashboard"));
const QuoteAnalytics = lazy(() => import("@/pages/quote-analytics"));
const QuoteDelivery = lazy(() => import("@/pages/quote-delivery"));
const PerformanceMetrics = lazy(() => import("@/pages/performance-metrics"));
const CompetitiveAnalysis = lazy(() => import("@/pages/competitive-analysis"));
const MarketingAnalytics = lazy(() => import("@/pages/marketing-analytics"));
const RevenueAssessment = lazy(() => import("@/pages/revenue-assessment"));

// Category 8: AI-powered features
const HardwareRecommendations = lazy(() => import("@/pages/hardware-recommendations"));
const ComplianceValidation = lazy(() => import("@/pages/compliance-validation"));
const AIChat = lazy(() => import("@/pages/ai-chat"));
const SQLAssistant = lazy(() => import("@/pages/sql-assistant"));

// Category 9: Organization & settings
const AccountSettings = lazy(() => import("@/pages/account-settings"));
const Integrations = lazy(() => import("@/pages/integrations"));
const HubSpotSettings = lazy(() => import("@/pages/hubspot-settings"));
const HubSpot = lazy(() => import("@/pages/hubspot"));
const Team = lazy(() => import("@/pages/team"));
const RolePermissions = lazy(() => import("@/pages/role-permissions"));
const Branding = lazy(() => import("@/pages/branding"));
const BrandingOnboarding = lazy(() => import("@/pages/BrandingOnboarding"));
const Profile = lazy(() => import("@/pages/profile"));
const Webhooks = lazy(() => import("@/pages/webhooks"));
const TrialSettings = lazy(() => import("@/pages/trial-settings"));
const SystemAdmin = lazy(() => import("@/pages/system-admin"));
const Roadmap = lazy(() => import("@/pages/Roadmap"));
const HROnboarding = lazy(() => import("@/pages/hr-onboarding"));
const JobTitles = lazy(() => import("@/pages/job-titles"));
const EmailTemplates = lazy(() => import("@/pages/email-templates"));

// Category 10: Sales & marketing
const Sales = lazy(() => import("@/pages/sales"));
const ServiceQueue = lazy(() => import("@/pages/service-queue"));
const ManagerDashboard = lazy(() => import("@/pages/manager-dashboard"));
const ProjectManagement = lazy(() => import("@/pages/project-management"));
const PMManagerAnalytics = lazy(() => import("@/pages/PMManagerAnalytics"));
const SalesMilestoneView = lazy(() => import("@/pages/SalesMilestoneView"));
const Scheduling = lazy(() => import("@/pages/scheduling"));
const Marketing = lazy(() => import("@/pages/marketing"));
const PublicLandingPage = lazy(() => import("@/pages/public-landing-page"));
const CaseStudies = lazy(() => import("@/pages/case-studies"));
const CaseStudyDetail = lazy(() => import("@/pages/case-study-detail"));
const Resources = lazy(() => import("@/pages/resources"));
const ResourceDetail = lazy(() => import("@/pages/resource-detail"));
const BlogAdmin = lazy(() => import("@/pages/blog-admin"));

// Category 11: System
const BugReport = lazy(() => import("@/pages/bug-report"));

// Category 14: Help & Onboarding
const HelpCenter = lazy(() => import("@/pages/help-center"));
const FeatureGuides = lazy(() => import("@/pages/feature-guides"));
const GettingStarted = lazy(() => import("@/pages/getting-started"));

// Category 12: Customer Portal (Public - no auth required)
const Portal = lazy(() => import("@/pages/portal"));

// Super Admin Portal (separate auth — ADMIN_USER/ADMIN_PASS, no main app auth required)
const SuperAdmin = lazy(() => import("@/pages/super-admin"));

// Category 13: Client Service Portal (Magic link auth - no main app auth required)
const ClientPortalLogin = lazy(() => import("@/pages/client-portal/login"));
const ClientPortalDashboard = lazy(() => import("@/pages/client-portal/dashboard"));
const ClientPortalNewRequest = lazy(() => import("@/pages/client-portal/new-request"));
const ClientPortalRequestDetail = lazy(() => import("@/pages/client-portal/request-detail"));
const ClientPortalTechnicianQuote = lazy(() => import("@/pages/client-portal/technician-quote"));
const ClientPortalProjectDetail = lazy(() => import("@/pages/client-portal/project-detail"));
const ClientPortalProjectReport = lazy(() => import("@/pages/client-portal/project-report"));
const ClientPortalScheduleSiteWalk = lazy(() => import("@/pages/client-portal/schedule-site-walk"));
const ClientPortalQuoteDetail = lazy(() => import("@/pages/client-portal/quote-detail"));

// Loading component for lazy-loaded routes
function PageLoading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-page" />
        <p className="text-sm text-muted-foreground">Loading page...</p>
      </div>
    </div>
  );
}

// Helper component to wrap lazy-loaded routes
function LazyRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public portal route - no auth required */}
      <Route path="/portal/:shareToken"><LazyRoute component={Portal} /></Route>
      
      {/* Client Service Portal - Magic link auth, no main app auth required */}
      <Route path="/client-portal/login"><LazyRoute component={ClientPortalLogin} /></Route>
      <Route path="/client-portal/new-request"><LazyRoute component={ClientPortalNewRequest} /></Route>
      <Route path="/client-portal/technician-quote"><LazyRoute component={ClientPortalTechnicianQuote} /></Route>
      <Route path="/client-portal/requests/:id"><LazyRoute component={ClientPortalRequestDetail} /></Route>
      <Route path="/client-portal/projects/:id/report"><LazyRoute component={ClientPortalProjectReport} /></Route>
      <Route path="/client-portal/projects/:id"><LazyRoute component={ClientPortalProjectDetail} /></Route>
      <Route path="/client-portal/quotes/:id"><LazyRoute component={ClientPortalQuoteDetail} /></Route>
      <Route path="/client-portal/schedule"><LazyRoute component={ClientPortalScheduleSiteWalk} /></Route>
      <Route path="/client-portal"><LazyRoute component={ClientPortalDashboard} /></Route>
      
      {/* Core routes - eagerly loaded */}
      <Route path="/"><LazyRoute component={Dashboard} /></Route>
      <Route path="/dashboard"><LazyRoute component={Dashboard} /></Route>
      <Route path="/projects"><LazyRoute component={Projects} /></Route>
      
      {/* IMPORTANT: Specific routes MUST come BEFORE dynamic routes */}
      {/* /projects/new must be before /projects/:id to prevent "new" being treated as an ID */}
      <Route path="/projects/new"><LazyRoute component={NewProject} /></Route>
      <Route path="/projects/bulk-import"><LazyRoute component={BulkImport} /></Route>
      {/* /projects/:id/duplicate and /projects/:projectId/openings/new before their respective dynamic routes */}
      <Route path="/projects/:id/duplicate"><LazyRoute component={DuplicateProject} /></Route>
      <Route path="/projects/:projectId/openings/new"><LazyRoute component={NewOpening} /></Route>
      <Route path="/door-survey"><LazyRoute component={DoorSurvey} /></Route>
      
      <Route path="/projects/:id"><LazyRoute component={ProjectDetail} /></Route>
      <Route path="/projects/:projectId/openings/:openingId"><LazyRoute component={OpeningDetail} /></Route>
      <Route path="/openings/:openingId"><LazyRoute component={OpeningDetail} /></Route>

      {/* Project management - lazy loaded */}
      <Route path="/projects/:projectId/compliance"><LazyRoute component={Compliance} /></Route>
      <Route path="/projects/:projectId/costs"><LazyRoute component={Costs} /></Route>
      <Route path="/projects/:id/hardware-schedule"><LazyRoute component={HardwareSchedule} /></Route>
      <Route path="/projects/:id/floor-plans"><LazyRoute component={FloorPlans} /></Route>
      <Route path="/projects/:id/scope-of-work"><LazyRoute component={ScopeOfWork} /></Route>
      <Route path="/projects/:projectId/pm-board"><LazyRoute component={PmBoard} /></Route>
      <Route path="/pm-board"><LazyRoute component={PmBoard} /></Route>
      <Route path="/div28-assessments"><LazyRoute component={Div28Assessments} /></Route>

      {/* Configuration & setup - lazy loaded */}
      <Route path="/templates"><LazyRoute component={Templates} /></Route>
      <Route path="/bundles"><LazyRoute component={Bundles} /></Route>
      <Route path="/reference"><LazyRoute component={Reference} /></Route>
      <Route path="/reference-library"><LazyRoute component={ReferenceLibrary} /></Route>
      <Route path="/catalog"><LazyRoute component={Catalog} /></Route>
      <Route path="/cross-reference"><LazyRoute component={CrossReference} /></Route>
      <Route path="/code-reference"><LazyRoute component={CodeReference} /></Route>

      {/* Data management - lazy loaded */}
      <Route path="/import"><LazyRoute component={Import} /></Route>
      <Route path="/export"><LazyRoute component={Export} /></Route>
      <Route path="/export-profiles"><LazyRoute component={ExportProfiles} /></Route>
      <Route path="/pdf-catalog-import"><LazyRoute component={PdfCatalogImport} /></Route>
      <Route path="/product-catalog-import"><LazyRoute component={ProductCatalogImport} /></Route>
      <Route path="/manufacturers"><LazyRoute component={Manufacturers} /></Route>
      <Route path="/distributors"><LazyRoute component={Distributors} /></Route>
      <Route path="/customers"><LazyRoute component={Customers} /></Route>

      {/* Financial & purchasing - lazy loaded */}
      <Route path="/costs"><LazyRoute component={Costs} /></Route>
      <Route path="/purchase-orders"><LazyRoute component={PurchaseOrders} /></Route>
      <Route path="/change-orders"><LazyRoute component={ChangeOrders} /></Route>
      <Route path="/billing"><LazyRoute component={Billing} /></Route>
      <Route path="/quote-payment/:quoteId"><LazyRoute component={QuotePayment} /></Route>
      <Route path="/quote-payment-success/:quoteId"><LazyRoute component={QuotePaymentSuccess} /></Route>

      {/* Specialized features - lazy loaded */}
      <Route path="/hardware-schedule"><LazyRoute component={HardwareSchedule} /></Route>
      <Route path="/engineering-review"><LazyRoute component={EngineeringReview} /></Route>
      <Route path="/disclaimers"><LazyRoute component={Disclaimers} /></Route>
      <Route path="/gasketing-catalog"><LazyRoute component={GasketingCatalog} /></Route>
      <Route path="/keying-systems"><LazyRoute component={KeyingSystems} /></Route>
      <Route path="/master-keying">{() => { window.location.replace('/keying-systems'); return null; }}</Route>
      <Route path="/wiring-diagrams"><LazyRoute component={WiringDiagrams} /></Route>
      <Route path="/floor-plans"><LazyRoute component={FloorPlans} /></Route>

      {/* Analytics & insights - lazy loaded */}
      <Route path="/analytics"><LazyRoute component={AnalyticsDashboard} /></Route>
      <Route path="/quote-analytics"><LazyRoute component={QuoteAnalytics} /></Route>
      <Route path="/quote-delivery"><LazyRoute component={QuoteDelivery} /></Route>
      <Route path="/projects/:projectId/quote-delivery"><LazyRoute component={QuoteDelivery} /></Route>
      <Route path="/performance"><LazyRoute component={PerformanceMetrics} /></Route>
      <Route path="/competitive"><LazyRoute component={CompetitiveAnalysis} /></Route>
      <Route path="/marketing-analytics"><LazyRoute component={MarketingAnalytics} /></Route>
      <Route path="/revenue-assessment"><LazyRoute component={RevenueAssessment} /></Route>

      {/* AI-powered features - lazy loaded */}
      <Route path="/recommendations"><LazyRoute component={HardwareRecommendations} /></Route>
      <Route path="/compliance-validation"><LazyRoute component={ComplianceValidation} /></Route>
      <Route path="/ai-chat"><LazyRoute component={AIChat} /></Route>
      <Route path="/sql-assistant"><LazyRoute component={SQLAssistant} /></Route>

      {/* Heavy dependencies - lazy loaded */}
      <Route path="/lidar-scans"><LazyRoute component={LidarScans} /></Route>
      <Route path="/ar-measurements"><LazyRoute component={ArMeasurements} /></Route>
      <Route path="/computer-vision"><LazyRoute component={ComputerVision} /></Route>
      <Route path="/document-intelligence"><LazyRoute component={DocumentIntelligence} /></Route>
      <Route path="/reports"><LazyRoute component={Reports} /></Route>

      {/* Organization & settings - lazy loaded */}
      <Route path="/settings"><LazyRoute component={AccountSettings} /></Route>
      <Route path="/integrations"><LazyRoute component={Integrations} /></Route>
      <Route path="/hubspot-settings"><LazyRoute component={HubSpotSettings} /></Route>
      <Route path="/hubspot"><LazyRoute component={HubSpot} /></Route>
      <Route path="/team"><LazyRoute component={Team} /></Route>
      <Route path="/hr-onboarding"><LazyRoute component={HROnboarding} /></Route>
      <Route path="/job-titles"><LazyRoute component={JobTitles} /></Route>
      <Route path="/email-templates"><LazyRoute component={EmailTemplates} /></Route>
      <Route path="/role-permissions"><LazyRoute component={RolePermissions} /></Route>
      <Route path="/branding"><LazyRoute component={Branding} /></Route>
      <Route path="/onboarding/branding"><LazyRoute component={BrandingOnboarding} /></Route>
      <Route path="/profile"><LazyRoute component={Profile} /></Route>
      <Route path="/webhooks"><LazyRoute component={Webhooks} /></Route>
      <Route path="/trial-settings"><LazyRoute component={TrialSettings} /></Route>
      <Route path="/system-admin"><LazyRoute component={SystemAdmin} /></Route>
      <Route path="/roadmap"><LazyRoute component={Roadmap} /></Route>

      {/* Sales & marketing - lazy loaded */}
      <Route path="/sales"><LazyRoute component={Sales} /></Route>
      <Route path="/service-queue"><LazyRoute component={ServiceQueue} /></Route>
      <Route path="/manager-dashboard"><LazyRoute component={ManagerDashboard} /></Route>
      <Route path="/project-management"><LazyRoute component={ProjectManagement} /></Route>
      <Route path="/pm-manager-analytics"><LazyRoute component={PMManagerAnalytics} /></Route>
      <Route path="/sales-milestones"><LazyRoute component={SalesMilestoneView} /></Route>
      <Route path="/scheduling"><LazyRoute component={Scheduling} /></Route>
      <Route path="/marketing"><LazyRoute component={Marketing} /></Route>
      <Route path="/case-studies/:slug"><LazyRoute component={CaseStudyDetail} /></Route>
      <Route path="/case-studies"><LazyRoute component={CaseStudies} /></Route>
      <Route path="/resources/:slug"><LazyRoute component={ResourceDetail} /></Route>
      <Route path="/resources"><LazyRoute component={Resources} /></Route>
      <Route path="/blog-admin"><LazyRoute component={BlogAdmin} /></Route>

      {/* System - lazy loaded */}
      <Route path="/bug-report"><LazyRoute component={BugReport} /></Route>

      {/* Help & Onboarding - lazy loaded */}
      <Route path="/help"><LazyRoute component={HelpCenter} /></Route>
      <Route path="/help/guides"><LazyRoute component={FeatureGuides} /></Route>
      <Route path="/onboarding/getting-started"><LazyRoute component={GettingStarted} /></Route>

      {/* 404 - eagerly loaded */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, user, error, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isOpen: tourOpen, startTour, endTour, hasCompletedTour, activeTrack } = useTour();
  const [wizardDialogOpen, setWizardDialogOpen] = useState(false);
  
  // Enable keyboard shortcuts for authenticated users
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
    onOpenHelp: () => setHelpModalOpen(true),
    onOpenSearch: () => setSearchOpen(true),
  });
  
  // Update RUM user context when authentication state changes
  // Clears user context on logout (user?.id becomes undefined)
  useEffect(() => {
    updateUserContext(user?.id?.toString());
  }, [user?.id]);

  // Sync user's language preference with i18n
  useEffect(() => {
    if (user?.language && i18n.language !== user.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user?.language]);

  // Track page views with PostHog
  useEffect(() => {
    trackPageView(location);
  }, [location]);

  // Identify user in PostHog when authenticated
  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organization?.id,
      });
    }
  }, [user]);
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-auth" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Super Admin Portal — separate auth, no main app sidebar
  if (location.startsWith("/super-admin")) {
    return (
      <Suspense fallback={<PageLoading />}>
        <SuperAdmin />
      </Suspense>
    );
  }

  // Show demo page for /demo route and any nested demo routes (public, reactive)
  if (location.startsWith("/demo")) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Demo />
      </Suspense>
    );
  }

  // Show prelaunch page if on /prelaunch route (public route)
  if (location === "/prelaunch") {
    return (
      <Suspense fallback={<PageLoading />}>
        <Prelaunch />
      </Suspense>
    );
  }

  if (location.startsWith("/sign-in") || location.startsWith("/sign-up")) {
    return <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
    </Switch>;
  }
  if (location === "/login") return <Redirect to="/sign-in" />;

  // Show forgot password page (public route)
  if (location === "/forgot-password") {
    return <Redirect to="/sign-in" />;
  }

  // Show reset password page (public route)
  if (location.startsWith("/reset-password")) {
    return <Redirect to="/sign-in" />;
  }

  // Show email verification page (public route)
  if (location.startsWith("/verify-email")) {
    return <Redirect to="/sign-in" />;
  }
  
  // Show public landing page for /l/:slug routes (public, no auth required)
  if (location.startsWith("/l/")) {
    return (
      <Suspense fallback={<PageLoading />}>
        <PublicLandingPage />
      </Suspense>
    );
  }

  // Show comprehensive feature landing page for /features route (public)
  if (location === "/features" || location === "/landing") {
    return (
      <Suspense fallback={<PageLoading />}>
        <Landing />
      </Suspense>
    );
  }

  // Show pricing page (public route, no auth required)
  if (location === "/pricing") {
    return (
      <Suspense fallback={<PageLoading />}>
        <Pricing />
      </Suspense>
    );
  }

  // Show landing page for unauthenticated users at root path
  // This allows visitors to see the landing page with pricing before signing up
  if (!isAuthenticated && location === "/") {
    return (
      <Suspense fallback={<PageLoading />}>
        <Landing />
      </Suspense>
    );
  }

  if (!isAuthenticated) return <Redirect to="/sign-in" />;
  if (error) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4" data-testid="auth-access-denied">
      <h1 className="text-xl font-semibold">Account access unavailable</h1>
      <p>We could not load your account. Please retry or contact your administrator.</p>
      <button onClick={() => window.location.reload()}>Retry</button>
      <button onClick={() => logout()}>Sign out</button>
    </div>
  );
  if (location === "/") return <Redirect to="/dashboard" />;

  // Show main app if authenticated
  return (
    <>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <header className="dsp-app-header flex items-center justify-between p-2 sm:p-4 shrink-0">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="dsp-app-wordmark"><strong>DoorSurvey Pro</strong><span>Division 8 field workspace</span></div>
              <div className="flex items-center gap-2">
                <TourTrigger className="hidden sm:flex" startTour={startTour} />
                <Suspense fallback={null}>
                  <RecentItemsPanel />
                </Suspense>
                <UserMenu />
                <ThemeToggle />
              </div>
            </header>
            <div className="dsp-breadcrumb-bar flex items-center justify-between px-4 pt-3 pb-2 border-b gap-2">
              <BreadcrumbNav />
              <PageHelpButton route={location} />
            </div>
            <main className="flex-1 overflow-auto">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
      
      <Suspense fallback={null}>
        <CommandPalette 
          open={commandPaletteOpen} 
          onOpenChange={setCommandPaletteOpen}
          onOpenHelp={() => setHelpModalOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />
      </Suspense>
      <KeyboardShortcutsDialog 
        open={helpModalOpen} 
        onOpenChange={setHelpModalOpen} 
      />
      <GlobalSearch 
        open={searchOpen} 
        onOpenChange={setSearchOpen}
      />
      <QuickCreateMenu />
      <Suspense fallback={null}>
        <GuidedTour 
          steps={activeTrack.steps}
          isOpen={tourOpen}
          onClose={endTour}
          onComplete={endTour}
          onNavigate={setLocation}
          trackId={activeTrack.id}
        />
      </Suspense>
      <Suspense fallback={null}>
        <WelcomeDialog
          onStartTour={startTour}
          onOpenWizard={() => setWizardDialogOpen(true)}
        />
      </Suspense>
      {wizardDialogOpen && (
        <Suspense fallback={null}>
          <GettingStartedWizard
            showAsDialog
            isOpen={wizardDialogOpen}
            onOpenChange={setWizardDialogOpen}
          />
        </Suspense>
      )}
    </>
  );
}

export default function App() {
  // Initialize RUM (Real User Monitoring) and PostHog once on app mount
  useEffect(() => {
    initRUM(undefined, import.meta.env.MODE);
    initPostHog();
  }, []);

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes>
          <ThemeProvider>
            <TooltipProvider>
              <AuthenticatedApp />
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
          </ClerkProviderWithRoutes>
          </WouterRouter>
        </QueryClientProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

