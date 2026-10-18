import { useMemo } from "react";
import { 
  Home, FolderOpen, Package, FileSpreadsheet, FileText, BookOpen, Upload, 
  Building2, Network, GitCompare, ShoppingCart, Truck, Users, ClipboardCheck, 
  FileWarning, CircleDot, CreditCard, Key, KeyRound, TrendingUp, Shield, 
  Palette, LayoutDashboard, ListChecks, Database, Settings, Zap, DollarSign, 
  Scan, Bug, User, Activity, BarChart3, FileEdit, Target, Brain, Lightbulb, 
  ShieldCheck, Eye, Sparkles, Megaphone, Ruler, FileDown, Lock, CalendarClock, 
  HelpCircle, Rocket, GraduationCap, UserCheck, Briefcase, Mail, Send, 
  ClipboardList, Layers, PenTool, Webhook, FileStack, Gauge, Milestone,
  UserCog, Cpu, CheckCircle, Bell, Kanban
} from "lucide-react";
import logoIconImage from "@assets/logo-icon-only.png";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useFeatureAccess, type FeatureKey } from "@/hooks/use-feature-access";
import { TrialStatusBanner } from "@/components/trial-status-banner";
import { useGettingStartedProgress } from "@/components/getting-started-wizard";
import { 
  canAccessUrl, 
  getEffectivePermissions,
  ROLE_LABELS as PERMISSION_ROLE_LABELS,
  type MembershipRole,
  type FeaturePermission,
} from "@shared/permissions";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  testId: string;
  badge?: string;
  requiredFeature?: string;
  requiredTier?: string;
  requiredPermission?: string;
  requiredRoles?: string[];
}

interface MenuSection {
  label: string;
  icon?: any;
  items: MenuItem[];
  collapsed?: boolean;
}

const menuSections: MenuSection[] = [
  {
    label: "Home",
    icon: Home,
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
        testId: "link-dashboard",
      },
    ],
  },
  {
    label: "Field Operations",
    icon: Scan,
    items: [
      {
        title: "Projects",
        url: "/projects",
        icon: FolderOpen,
        testId: "link-projects",
      },
      {
        title: "Door Survey",
        url: "/door-survey",
        icon: ClipboardList,
        testId: "link-door-survey",
      },
      {
        title: "Floor Plans",
        url: "/floor-plans",
        icon: Layers,
        testId: "link-floor-plans",
      },
      {
        title: "LiDAR Scans",
        url: "/lidar-scans",
        icon: Scan,
        testId: "link-lidar-scans",
      },
      {
        title: "AR Measurements",
        url: "/ar-measurements",
        icon: Ruler,
        testId: "link-ar-measurements",
      },
      {
        title: "Wiring Diagrams",
        url: "/wiring-diagrams",
        icon: Zap,
        testId: "link-wiring-diagrams",
      },
      {
        title: "Change Orders",
        url: "/change-orders",
        icon: FileEdit,
        testId: "link-change-orders",
      },
      {
        title: "Div28 Security",
        url: "/div28-assessments",
        icon: Shield,
        testId: "link-div28-assessments",
        badge: "New",
      },
      {
        title: "PM Board",
        url: "/pm-board",
        icon: Kanban,
        testId: "link-pm-board",
        badge: "New",
      },
    ],
  },
  {
    label: "Estimating",
    icon: Ruler,
    items: [
      {
        title: "Templates",
        url: "/templates",
        icon: FileText,
        testId: "link-templates",
      },
      {
        title: "Bundles",
        url: "/bundles",
        icon: Package,
        testId: "link-bundles",
      },
      {
        title: "Hardware Schedule",
        url: "/hardware-schedule",
        icon: ListChecks,
        testId: "link-hardware-schedule",
      },
      {
        title: "Cost Tracking",
        url: "/costs",
        icon: DollarSign,
        testId: "link-costs",
      },
      {
        title: "Keying Systems",
        url: "/keying-systems",
        icon: Key,
        testId: "link-keying-systems",
      },
      {
        title: "Gasketing",
        url: "/gasketing-catalog",
        icon: CircleDot,
        testId: "link-gasketing-catalog",
      },
    ],
  },
  {
    label: "Quotes & Delivery",
    icon: Send,
    items: [
      {
        title: "Engineering Review",
        url: "/engineering-review",
        icon: ClipboardCheck,
        testId: "link-engineering-review",
      },
      {
        title: "Quote Delivery",
        url: "/quote-delivery",
        icon: Send,
        testId: "link-quote-delivery",
      },
      {
        title: "Quote Analytics",
        url: "/quote-analytics",
        icon: BarChart3,
        testId: "link-quote-analytics",
        requiredFeature: "advancedReporting",
        requiredTier: "Professional",
      },
      {
        title: "Disclaimers",
        url: "/disclaimers",
        icon: FileWarning,
        testId: "link-disclaimers",
      },
    ],
  },
  {
    label: "Project Management",
    icon: FolderOpen,
    items: [
      {
        title: "Project Overview",
        url: "/project-management",
        icon: FolderOpen,
        testId: "link-project-management",
      },
      {
        title: "Service Queue",
        url: "/service-queue",
        icon: ListChecks,
        testId: "link-service-queue",
      },
      {
        title: "Manager Dashboard",
        url: "/manager-dashboard",
        icon: Gauge,
        testId: "link-manager-dashboard",
      },
      {
        title: "PM Analytics",
        url: "/pm-manager-analytics",
        icon: BarChart3,
        testId: "link-pm-manager-analytics",
        requiredFeature: "advancedReporting",
        requiredTier: "Professional",
      },
      {
        title: "Scheduling",
        url: "/scheduling",
        icon: CalendarClock,
        testId: "link-scheduling",
      },
    ],
  },
  {
    label: "Sales & CRM",
    icon: TrendingUp,
    items: [
      {
        title: "Customers",
        url: "/customers",
        icon: Users,
        testId: "link-customers",
      },
      {
        title: "Sales Pipeline",
        url: "/sales",
        icon: TrendingUp,
        testId: "link-sales",
      },
      {
        title: "Sales Milestones",
        url: "/sales-milestones",
        icon: Milestone,
        testId: "link-sales-milestones",
      },
      {
        title: "Marketing",
        url: "/marketing",
        icon: Megaphone,
        testId: "link-marketing",
      },
      {
        title: "Email Templates",
        url: "/email-templates",
        icon: Mail,
        testId: "link-email-templates",
      },
    ],
  },
  {
    label: "Procurement",
    icon: ShoppingCart,
    items: [
      {
        title: "Purchase Orders",
        url: "/purchase-orders",
        icon: ShoppingCart,
        testId: "link-purchase-orders",
      },
      {
        title: "Manufacturers",
        url: "/manufacturers",
        icon: Building2,
        testId: "link-manufacturers",
      },
      {
        title: "Distributors",
        url: "/distributors",
        icon: Truck,
        testId: "link-distributors",
      },
    ],
  },
  {
    label: "Product Catalog",
    icon: Package,
    items: [
      {
        title: "Catalog",
        url: "/catalog",
        icon: Package,
        testId: "link-catalog",
      },
      {
        title: "Reference Library",
        url: "/reference-library",
        icon: BookOpen,
        testId: "link-reference-library",
      },
      {
        title: "Code Reference",
        url: "/code-reference",
        icon: ShieldCheck,
        testId: "link-code-reference",
      },
      {
        title: "Cross-Reference",
        url: "/cross-reference",
        icon: GitCompare,
        testId: "link-cross-reference",
      },
      {
        title: "Reference Data",
        url: "/reference",
        icon: Database,
        testId: "link-reference",
      },
    ],
  },
  {
    label: "Analytics & Reports",
    icon: BarChart3,
    items: [
      {
        title: "Analytics Dashboard",
        url: "/analytics",
        icon: BarChart3,
        testId: "link-analytics-dashboard",
        requiredFeature: "advancedReporting",
        requiredTier: "Professional",
      },
      {
        title: "Reports",
        url: "/reports",
        icon: FileEdit,
        testId: "link-reports",
        requiredFeature: "advancedReporting",
        requiredTier: "Professional",
      },
      {
        title: "Performance",
        url: "/performance",
        icon: Activity,
        testId: "link-performance",
      },
      {
        title: "Competitive Analysis",
        url: "/competitive",
        icon: Target,
        testId: "link-competitive",
      },
      {
        title: "Revenue Assessment",
        url: "/revenue-assessment",
        icon: DollarSign,
        testId: "link-revenue-assessment",
        requiredFeature: "advancedReporting",
        requiredTier: "Professional",
      },
    ],
  },
  {
    label: "AI & Automation",
    icon: Sparkles,
    collapsed: true,
    items: [
      {
        title: "AI Assistant",
        url: "/ai-chat",
        icon: Sparkles,
        testId: "link-ai-chat",
        requiredFeature: "aiAudits",
        requiredTier: "Enterprise",
      },
      {
        title: "Hardware Recommendations",
        url: "/recommendations",
        icon: Lightbulb,
        testId: "link-recommendations",
      },
      {
        title: "Compliance Validation",
        url: "/compliance-validation",
        icon: CheckCircle,
        testId: "link-compliance-validation",
      },
      {
        title: "Computer Vision",
        url: "/computer-vision",
        icon: Eye,
        testId: "link-computer-vision",
        requiredFeature: "aiAudits",
        requiredTier: "Enterprise",
      },
      {
        title: "Document Intelligence",
        url: "/document-intelligence",
        icon: FileText,
        testId: "link-document-intelligence",
        requiredFeature: "aiAudits",
        requiredTier: "Enterprise",
      },
    ],
  },
  {
    label: "Team & HR",
    icon: Users,
    items: [
      {
        title: "Team & Roles",
        url: "/team",
        icon: Shield,
        testId: "link-team",
      },
      {
        title: "HR Onboarding",
        url: "/hr-onboarding",
        icon: UserCheck,
        testId: "link-hr-onboarding",
      },
      {
        title: "Job Titles",
        url: "/job-titles",
        icon: Briefcase,
        testId: "link-job-titles",
      },
    ],
  },
  {
    label: "Organization",
    icon: Building2,
    items: [
      {
        title: "Branding",
        url: "/branding",
        icon: Palette,
        testId: "link-branding",
      },
      {
        title: "Integrations",
        url: "/integrations",
        icon: Network,
        testId: "link-integrations",
        requiredFeature: "crmSync",
        requiredTier: "Enterprise",
      },
      {
        title: "Webhooks",
        url: "/webhooks",
        icon: Webhook,
        testId: "link-webhooks",
      },
      {
        title: "Blog Admin",
        url: "/blog-admin",
        icon: PenTool,
        testId: "link-blog-admin",
      },
      {
        title: "Roadmap",
        url: "/roadmap",
        icon: Target,
        testId: "link-roadmap",
      },
      {
        title: "System Admin",
        url: "/system-admin",
        icon: Cpu,
        testId: "link-system-admin",
        requiredRoles: ["owner", "admin"],
      },
    ],
  },
  {
    label: "Data Management",
    icon: Database,
    items: [
      {
        title: "Import Data",
        url: "/import",
        icon: Upload,
        testId: "link-import",
      },
      {
        title: "Export Data",
        url: "/export",
        icon: FileSpreadsheet,
        testId: "link-export",
      },
      {
        title: "Export Profiles",
        url: "/export-profiles",
        icon: FileDown,
        testId: "link-export-profiles",
      },
      {
        title: "PDF Catalog Import",
        url: "/pdf-catalog-import",
        icon: FileStack,
        testId: "link-pdf-catalog-import",
      },
    ],
  },
  {
    label: "Account",
    icon: User,
    items: [
      {
        title: "Profile",
        url: "/profile",
        icon: User,
        testId: "link-profile",
      },
      {
        title: "Account Settings",
        url: "/settings",
        icon: Settings,
        testId: "link-account-settings",
      },
      {
        title: "Plan & Usage",
        url: "/billing",
        icon: CreditCard,
        testId: "link-billing",
      },
      {
        title: "Trial Settings",
        url: "/trial-settings",
        icon: Sparkles,
        testId: "link-trial-settings",
      },
      {
        title: "Bug Reports",
        url: "/bug-report",
        icon: Bug,
        testId: "link-bug-report",
      },
    ],
  },
  {
    label: "Help & Support",
    icon: HelpCircle,
    items: [
      {
        title: "Help Center",
        url: "/help",
        icon: HelpCircle,
        testId: "link-help-center",
      },
      {
        title: "Feature Guides",
        url: "/help/guides",
        icon: GraduationCap,
        testId: "link-feature-guides",
      },
      {
        title: "Getting Started",
        url: "/onboarding/getting-started",
        icon: Rocket,
        testId: "link-getting-started",
      },
    ],
  },
];

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  pm_manager: "PM Manager",
  manager: "Manager",
  project_manager: "Project Manager",
  engineer: "Engineer",
  sales_rep: "Sales Rep",
  procurement_officer: "Procurement",
  technician: "Technician",
  viewer: "Viewer",
};

const ROLE_BADGE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "default",
  pm_manager: "default",
  manager: "secondary",
  project_manager: "secondary",
  engineer: "secondary",
  sales_rep: "secondary",
  procurement_officer: "secondary",
  technician: "outline",
  viewer: "outline",
};

function shouldShowMenuItem(
  item: MenuItem,
  userRoles: MembershipRole[],
  hasFeatureAccessFn: (feature: Exclude<FeatureKey, "projectLimit" | "userLimit" | "barcodeScanLimit">) => boolean,
  customPermissions?: Record<MembershipRole, FeaturePermission[]>
): boolean {
  if (!canAccessUrl(item.url, userRoles, customPermissions)) {
    return false;
  }
  
  if (item.requiredRoles && item.requiredRoles.length > 0) {
    const hasRequiredRole = item.requiredRoles.some(role => 
      userRoles.includes(role as MembershipRole)
    );
    if (!hasRequiredRole) {
      return false;
    }
  }
  
  return true;
}

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const { hasFeatureAccess } = useFeatureAccess();
  const isCollapsed = state === "collapsed";
  
  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const { data: orgPermissions } = useQuery<{
    permissions: Record<string, string[]>;
    hasCustomizations: boolean;
    customizedRoles: string[];
  }>({
    queryKey: ["/api/team/role-permissions"],
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: quoteRequests } = useQuery<any[]>({
    queryKey: ["/api/quote-requests"],
    enabled: !!user && hasFeatureAccess("engineeringReview"),
  });

  const { data: leads } = useQuery<any[]>({
    queryKey: ["/api/leads"],
    enabled: !!user,
  });

  const pendingQuotesCount = quoteRequests?.filter(q => q.reviewStatus === "pending_review").length || 0;
  const newLeadsCount = leads?.filter(l => l.status === "new").length || 0;

  const { progress: gettingStartedProgress } = useGettingStartedProgress();
  const setupStepsTotal = 6;
  const setupStepsComplete = Object.values(gettingStartedProgress).filter(Boolean).length;
  const isSetupComplete = setupStepsComplete >= setupStepsTotal;
  
  const userRoles: MembershipRole[] = useMemo(() => {
    if (!user) return [];
    const roles: MembershipRole[] = [];
    if (user.role) roles.push(user.role as MembershipRole);
    if (user.roles?.length) {
      user.roles.forEach((r: string) => {
        if (!roles.includes(r as MembershipRole)) {
          roles.push(r as MembershipRole);
        }
      });
    }
    return roles.length > 0 ? roles : ["viewer" as MembershipRole];
  }, [user?.role, user?.roles]);

  const customPermissions = useMemo(() => {
    if (!orgPermissions?.permissions) return undefined;
    return orgPermissions.permissions as Record<MembershipRole, FeaturePermission[]>;
  }, [orgPermissions?.permissions]);

  const visibleSections = useMemo(() => {
    return menuSections.map(section => ({
      ...section,
      items: section.items.filter(item => 
        shouldShowMenuItem(item, userRoles, hasFeatureAccess, customPermissions)
      ),
    })).filter(section => section.items.length > 0);
  }, [userRoles, hasFeatureAccess, customPermissions]);

  return (
    <Sidebar>
      <SidebarHeader className="dsp-sidebar-header border-b border-sidebar-border p-4 pl-6 group-data-[collapsible=icon]:p-2">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          {!isCollapsed && (
            <div className="flex flex-col flex-1">
              <span className="text-sm font-semibold">DoorSurvey Pro</span>
              <span className="text-xs text-muted-foreground">Survey · Estimate · Deliver</span>
            </div>
          )}
          <img 
            src={logoIconImage} 
            alt="DoorSurvey Pro" 
            className={`object-contain ${isCollapsed ? 'h-8 w-8' : 'h-10 w-10'}`}
            data-testid="img-sidebar-logo"
          />
        </div>
      </SidebarHeader>
      <SidebarContent className="dsp-sidebar-content">
        <div className="p-4 pt-3">
          <TrialStatusBanner />
        </div>
        {visibleSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="flex items-center gap-2">
              {section.icon && <section.icon className="h-3.5 w-3.5" />}
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="pl-4">
                {section.items.map((item) => {
                  const isActive = location === item.url || (item.url === "/" && location === "/dashboard");
                  let badgeCount = 0;
                  
                  if (item.url === "/engineering-review" && pendingQuotesCount > 0) {
                    badgeCount = pendingQuotesCount;
                  } else if (item.url === "/sales" && newLeadsCount > 0) {
                    badgeCount = newLeadsCount;
                  }

                  const isGettingStartedItem = item.url === "/onboarding/getting-started";
                  const showSetupBadge = isGettingStartedItem && !isSetupComplete;
                  
                  const hasAccess = item.requiredFeature 
                    ? hasFeatureAccess(item.requiredFeature as Exclude<FeatureKey, "projectLimit" | "userLimit" | "barcodeScanLimit">) 
                    : true;
                  const isLocked = !hasAccess;
                  
                  const handleNavigation = () => {
                    setLocation(item.url);
                    if (isMobile) {
                      setOpenMobile(false);
                    }
                  };
                  
                  const menuButton = (
                    <SidebarMenuButton
                      className="dsp-nav-item"
                      isActive={isActive}
                      onClick={handleNavigation}
                      data-testid={item.testId}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className={isLocked ? "text-muted-foreground" : ""}>{item.title}</span>
                      {isLocked && (
                        <Lock 
                          className="h-3.5 w-3.5 ml-auto text-muted-foreground" 
                          data-testid={`icon-locked-${item.testId}`}
                        />
                      )}
                      {!isLocked && badgeCount > 0 && (
                        <Badge 
                          variant="default" 
                          className="ml-auto h-5 min-w-5 px-1 text-xs"
                          data-testid={`badge-count-${item.testId}`}
                        >
                          {badgeCount}
                        </Badge>
                      )}
                      {showSetupBadge && (
                        <Badge 
                          variant="secondary" 
                          className="ml-auto h-5 px-1.5 text-[10px]"
                          data-testid="badge-setup-progress"
                        >
                          {setupStepsComplete}/{setupStepsTotal}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  );
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      {isLocked ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {menuButton}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="font-semibold">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Requires {item.requiredTier} plan or higher
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        menuButton
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      {user?.role && (
        <SidebarFooter className="dsp-sidebar-footer border-t border-sidebar-border p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate" data-testid="text-user-name">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
                {user.email}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Badge 
                variant={ROLE_BADGE_VARIANTS[user.role] || "outline"}
                data-testid="badge-user-role"
              >
                {ROLE_LABELS[user.role] || user.role}
              </Badge>
              {user.roles?.length > 0 && (
                <Badge variant="outline" className="text-xs" data-testid="badge-additional-roles">
                  +{user.roles.length}
                </Badge>
              )}
            </div>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

