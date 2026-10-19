import { type MembershipRole } from "./schemas/auth.schema";

export type { MembershipRole } from "./schemas/auth.schema";

export type FeatureCategory =
  | "dashboard"
  | "estimating"
  | "quotes"
  | "projectManagement"
  | "reviewTools"
  | "purchasing"
  | "analytics"
  | "company"
  | "settings"
  | "helpSupport";

export type FeaturePermission =
  | "view_dashboard"
  | "view_projects"
  | "create_projects"
  | "edit_projects"
  | "delete_projects"
  | "view_templates"
  | "manage_templates"
  | "view_costs"
  | "manage_costs"
  | "view_hardware_schedule"
  | "manage_hardware_schedule"
  | "view_catalog"
  | "manage_catalog"
  | "import_catalog"
  | "view_bundles"
  | "manage_bundles"
  | "view_keying"
  | "manage_keying"
  | "view_gasketing"
  | "view_quotes"
  | "create_quotes"
  | "approve_quotes"
  | "engineering_review"
  | "view_quote_analytics"
  | "manage_disclaimers"
  | "view_floor_plans"
  | "edit_floor_plans"
  | "view_lidar"
  | "manage_lidar"
  | "view_ar_measurements"
  | "view_wiring_diagrams"
  | "view_change_orders"
  | "create_change_orders"
  | "approve_change_orders"
  | "use_ai_assistant"
  | "view_recommendations"
  | "use_computer_vision"
  | "use_document_intelligence"
  | "view_reference"
  | "view_purchase_orders"
  | "create_purchase_orders"
  | "approve_purchase_orders"
  | "view_manufacturers"
  | "manage_manufacturers"
  | "view_distributors"
  | "manage_distributors"
  | "view_analytics"
  | "view_reports"
  | "view_performance"
  | "view_competitive"
  | "view_customers"
  | "manage_customers"
  | "view_sales_pipeline"
  | "manage_sales_pipeline"
  | "view_scheduling"
  | "manage_scheduling"
  | "view_marketing"
  | "manage_marketing"
  | "view_team"
  | "manage_team"
  | "view_branding"
  | "manage_branding"
  | "view_roadmap"
  | "view_integrations"
  | "manage_integrations"
  | "import_data"
  | "export_data"
  | "view_settings"
  | "manage_settings"
  | "view_profile"
  | "manage_profile"
  | "view_billing"
  | "manage_billing"
  | "manage_trial_settings"
  | "submit_bug_reports"
  | "view_help"
  | "view_hr_onboarding"
  | "manage_hr_onboarding"
  | "manage_hr_integrations";

export const ALL_PERMISSIONS: FeaturePermission[] = [
  "view_dashboard",
  "view_projects",
  "create_projects",
  "edit_projects",
  "delete_projects",
  "view_templates",
  "manage_templates",
  "view_costs",
  "manage_costs",
  "view_hardware_schedule",
  "manage_hardware_schedule",
  "view_catalog",
  "manage_catalog",
  "import_catalog",
  "view_bundles",
  "manage_bundles",
  "view_keying",
  "manage_keying",
  "view_gasketing",
  "view_quotes",
  "create_quotes",
  "approve_quotes",
  "engineering_review",
  "view_quote_analytics",
  "manage_disclaimers",
  "view_floor_plans",
  "edit_floor_plans",
  "view_lidar",
  "manage_lidar",
  "view_ar_measurements",
  "view_wiring_diagrams",
  "view_change_orders",
  "create_change_orders",
  "approve_change_orders",
  "use_ai_assistant",
  "view_recommendations",
  "use_computer_vision",
  "use_document_intelligence",
  "view_reference",
  "view_purchase_orders",
  "create_purchase_orders",
  "approve_purchase_orders",
  "view_manufacturers",
  "manage_manufacturers",
  "view_distributors",
  "manage_distributors",
  "view_analytics",
  "view_reports",
  "view_performance",
  "view_competitive",
  "view_customers",
  "manage_customers",
  "view_sales_pipeline",
  "manage_sales_pipeline",
  "view_scheduling",
  "manage_scheduling",
  "view_marketing",
  "manage_marketing",
  "view_team",
  "manage_team",
  "view_branding",
  "manage_branding",
  "view_roadmap",
  "view_integrations",
  "manage_integrations",
  "import_data",
  "export_data",
  "view_settings",
  "manage_settings",
  "view_profile",
  "manage_profile",
  "view_billing",
  "manage_billing",
  "manage_trial_settings",
  "submit_bug_reports",
  "view_help",
  "view_hr_onboarding",
  "manage_hr_onboarding",
  "manage_hr_integrations",
];

export const DEFAULT_ROLE_PERMISSIONS: Record<MembershipRole, FeaturePermission[]> = {
  owner: [...ALL_PERMISSIONS],
  admin: [...ALL_PERMISSIONS],
  pm_manager: [
    "view_dashboard",
    "view_projects",
    "create_projects",
    "edit_projects",
    "view_templates",
    "manage_templates",
    "view_costs",
    "manage_costs",
    "view_hardware_schedule",
    "manage_hardware_schedule",
    "view_catalog",
    "view_bundles",
    "view_keying",
    "view_gasketing",
    "view_quotes",
    "create_quotes",
    "approve_quotes",
    "engineering_review",
    "view_quote_analytics",
    "view_floor_plans",
    "edit_floor_plans",
    "view_lidar",
    "view_ar_measurements",
    "view_wiring_diagrams",
    "view_change_orders",
    "create_change_orders",
    "approve_change_orders",
    "view_recommendations",
    "view_reference",
    "view_purchase_orders",
    "approve_purchase_orders",
    "view_manufacturers",
    "view_distributors",
    "view_analytics",
    "view_reports",
    "view_performance",
    "view_customers",
    "view_scheduling",
    "manage_scheduling",
    "view_team",
    "view_hr_onboarding",
    "manage_hr_onboarding",
    "view_profile",
    "manage_profile",
    "view_help",
  ],
  manager: [
    "view_dashboard",
    "view_projects",
    "create_projects",
    "edit_projects",
    "view_templates",
    "view_costs",
    "view_hardware_schedule",
    "view_catalog",
    "view_bundles",
    "view_keying",
    "view_gasketing",
    "view_quotes",
    "create_quotes",
    "engineering_review",
    "view_floor_plans",
    "view_lidar",
    "view_ar_measurements",
    "view_wiring_diagrams",
    "view_change_orders",
    "create_change_orders",
    "view_recommendations",
    "view_reference",
    "view_purchase_orders",
    "view_manufacturers",
    "view_distributors",
    "view_analytics",
    "view_performance",
    "view_customers",
    "view_scheduling",
    "view_team",
    "view_hr_onboarding",
    "manage_hr_onboarding",
    "view_profile",
    "manage_profile",
    "view_help",
  ],
  project_manager: [
    "view_dashboard",
    "view_projects",
    "create_projects",
    "edit_projects",
    "view_templates",
    "view_costs",
    "manage_costs",
    "view_hardware_schedule",
    "manage_hardware_schedule",
    "view_catalog",
    "view_bundles",
    "view_keying",
    "view_gasketing",
    "view_quotes",
    "create_quotes",
    "engineering_review",
    "view_floor_plans",
    "edit_floor_plans",
    "view_lidar",
    "manage_lidar",
    "view_ar_measurements",
    "view_wiring_diagrams",
    "view_change_orders",
    "create_change_orders",
    "view_recommendations",
    "view_reference",
    "view_purchase_orders",
    "create_purchase_orders",
    "view_manufacturers",
    "view_distributors",
    "view_performance",
    "view_customers",
    "view_scheduling",
    "view_profile",
    "manage_profile",
    "view_help",
  ],
  engineer: [
    "view_dashboard",
    "view_projects",
    "view_hardware_schedule",
    "view_catalog",
    "view_bundles",
    "view_keying",
    "manage_keying",
    "view_gasketing",
    "engineering_review",
    "view_quotes",
    "view_floor_plans",
    "view_lidar",
    "view_ar_measurements",
    "view_wiring_diagrams",
    "view_recommendations",
    "use_computer_vision",
    "use_document_intelligence",
    "view_reference",
    "view_profile",
    "manage_profile",
    "view_help",
  ],
  sales_rep: [
    "view_dashboard",
    "view_projects",
    "create_projects",
    "view_catalog",
    "view_bundles",
    "view_gasketing",
    "view_quotes",
    "create_quotes",
    "view_quote_analytics",
    "view_floor_plans",
    "view_recommendations",
    "view_customers",
    "manage_customers",
    "view_sales_pipeline",
    "manage_sales_pipeline",
    "view_scheduling",
    "manage_scheduling",
    "view_marketing",
    "view_profile",
    "manage_profile",
    "view_help",
  ],
  procurement_officer: [
    "view_dashboard",
    "view_projects",
    "view_catalog",
    "view_bundles",
    "view_quotes",
    "view_purchase_orders",
    "create_purchase_orders",
    "approve_purchase_orders",
    "view_manufacturers",
    "manage_manufacturers",
    "view_distributors",
    "manage_distributors",
    "view_profile",
    "manage_profile",
    "view_help",
  ],
  technician: [
    "view_dashboard",
    "view_projects",
    "view_hardware_schedule",
    "view_catalog",
    "view_gasketing",
    "view_floor_plans",
    "view_lidar",
    "view_ar_measurements",
    "view_wiring_diagrams",
    "view_reference",
    "view_profile",
    "view_help",
  ],
  viewer: [
    "view_dashboard",
    "view_projects",
    "view_catalog",
    "view_quotes",
    "view_floor_plans",
    "view_reference",
    "view_profile",
    "view_help",
  ],
};

export const URL_PERMISSION_MAP: Record<string, FeaturePermission> = {
  "/": "view_dashboard",
  "/projects": "view_projects",
  "/templates": "view_templates",
  "/costs": "view_costs",
  "/hardware-schedule": "view_hardware_schedule",
  "/catalog": "view_catalog",
  "/pdf-catalog-import": "import_catalog",
  "/bundles": "view_bundles",
  "/keying-systems": "view_keying",
  "/master-keying": "manage_keying",
  "/gasketing-catalog": "view_gasketing",
  "/engineering-review": "engineering_review",
  "/quote-analytics": "view_quote_analytics",
  "/quote-delivery": "create_quotes",
  "/disclaimers": "manage_disclaimers",
  "/floor-plans": "view_floor_plans",
  "/lidar-scans": "view_lidar",
  "/ar-measurements": "view_ar_measurements",
  "/wiring-diagrams": "view_wiring_diagrams",
  "/change-orders": "view_change_orders",
  "/ai-chat": "use_ai_assistant",
  "/recommendations": "view_recommendations",
  "/computer-vision": "use_computer_vision",
  "/document-intelligence": "use_document_intelligence",
  "/compliance-validation": "view_recommendations",
  "/reference": "view_reference",
  "/reference-library": "view_reference",
  "/code-reference": "view_reference",
  "/cross-reference": "view_reference",
  "/purchase-orders": "view_purchase_orders",
  "/manufacturers": "view_manufacturers",
  "/distributors": "view_distributors",
  "/analytics": "view_analytics",
  "/reports": "view_reports",
  "/performance": "view_performance",
  "/competitive": "view_competitive",
  "/customers": "view_customers",
  "/sales": "view_sales_pipeline",
  "/sales-milestones": "view_sales_pipeline",
  "/scheduling": "view_scheduling",
  "/marketing": "view_marketing",
  "/team": "view_team",
  "/branding": "view_branding",
  "/roadmap": "view_roadmap",
  "/integrations": "view_integrations",
  "/webhooks": "manage_integrations",
  "/blog-admin": "manage_marketing",
  "/import": "import_data",
  "/export": "export_data",
  "/export-profiles": "export_data",
  "/settings": "view_settings",
  "/profile": "view_profile",
  "/billing": "view_billing",
  "/trial-settings": "manage_trial_settings",
  "/bug-report": "submit_bug_reports",
  "/help": "view_help",
  "/help/guides": "view_help",
  "/onboarding/getting-started": "view_help",
  "/hr-onboarding": "view_hr_onboarding",
  "/job-titles": "view_team",
  "/door-survey": "view_projects",
  "/service-queue": "view_projects",
  "/manager-dashboard": "view_analytics",
  "/project-management": "view_projects",
  "/pm-manager-analytics": "view_analytics",
  "/email-templates": "view_marketing",
};

export function hasPermission(
  userRoles: MembershipRole[],
  permission: FeaturePermission,
  customPermissions?: Record<MembershipRole, FeaturePermission[]>
): boolean {
  const permissionSets = customPermissions || DEFAULT_ROLE_PERMISSIONS;
  return userRoles.some((role) => permissionSets[role]?.includes(permission));
}

export function getEffectivePermissions(
  userRoles: MembershipRole[],
  customPermissions?: Record<MembershipRole, FeaturePermission[]>
): FeaturePermission[] {
  const permissionSets = customPermissions || DEFAULT_ROLE_PERMISSIONS;
  const permissions = new Set<FeaturePermission>();
  userRoles.forEach((role) => {
    permissionSets[role]?.forEach((p) => permissions.add(p));
  });
  return Array.from(permissions);
}

export function canAccessUrl(
  url: string,
  userRoles: MembershipRole[],
  customPermissions?: Record<MembershipRole, FeaturePermission[]>
): boolean {
  const requiredPermission = URL_PERMISSION_MAP[url];
  if (!requiredPermission) return true;
  return hasPermission(userRoles, requiredPermission, customPermissions);
}

export const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  pm_manager: "PM Manager",
  manager: "Manager",
  project_manager: "Project Manager",
  engineer: "Engineer",
  sales_rep: "Sales Representative",
  procurement_officer: "Procurement Officer",
  technician: "Technician",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<MembershipRole, string> = {
  owner: "Full organization control and billing access",
  admin: "Manage users, settings, and organization configuration",
  pm_manager: "Oversight of all project managers with analytics",
  manager: "Approve quotes, manage projects and team",
  project_manager: "Manage projects, procurement, and work assignments",
  engineer: "Review and approve engineering specifications",
  sales_rep: "Handle sales pipeline and proposal delivery",
  procurement_officer: "Manage purchasing and vendor relationships",
  technician: "Conduct field surveys and site assessments",
  viewer: "Read-only access to projects and data",
};

export const PERMISSION_CATEGORIES: Record<
  FeatureCategory,
  {
    label: string;
    permissions: { key: FeaturePermission; label: string; description: string }[];
  }
> = {
  dashboard: {
    label: "Dashboard",
    permissions: [
      {
        key: "view_dashboard",
        label: "View Dashboard",
        description: "Access the main dashboard",
      },
    ],
  },
  estimating: {
    label: "Estimating",
    permissions: [
      {
        key: "view_projects",
        label: "View Projects",
        description: "View project list and details",
      },
      {
        key: "create_projects",
        label: "Create Projects",
        description: "Create new projects",
      },
      {
        key: "edit_projects",
        label: "Edit Projects",
        description: "Modify existing projects",
      },
      {
        key: "delete_projects",
        label: "Delete Projects",
        description: "Remove projects",
      },
      {
        key: "view_templates",
        label: "View Templates",
        description: "Access project templates",
      },
      {
        key: "manage_templates",
        label: "Manage Templates",
        description: "Create and modify project templates",
      },
      {
        key: "view_costs",
        label: "View Costs",
        description: "View cost tracking data",
      },
      {
        key: "manage_costs",
        label: "Manage Costs",
        description: "Edit cost tracking data",
      },
      {
        key: "view_hardware_schedule",
        label: "View Hardware Schedule",
        description: "Access hardware schedules",
      },
      {
        key: "manage_hardware_schedule",
        label: "Manage Hardware Schedule",
        description: "Create and modify hardware schedules",
      },
      {
        key: "view_catalog",
        label: "View Catalog",
        description: "Access product catalog",
      },
      {
        key: "manage_catalog",
        label: "Manage Catalog",
        description: "Add and edit catalog items",
      },
      {
        key: "import_catalog",
        label: "Import Catalog",
        description: "Import catalog data from external sources",
      },
      {
        key: "view_bundles",
        label: "View Bundles",
        description: "Access product bundles",
      },
      {
        key: "manage_bundles",
        label: "Manage Bundles",
        description: "Create and edit product bundles",
      },
      {
        key: "view_keying",
        label: "View Keying",
        description: "Access keying systems",
      },
      {
        key: "manage_keying",
        label: "Manage Keying",
        description: "Configure keying systems",
      },
      {
        key: "view_gasketing",
        label: "View Gasketing",
        description: "Access gasketing catalog",
      },
    ],
  },
  quotes: {
    label: "Quotes",
    permissions: [
      {
        key: "view_quotes",
        label: "View Quotes",
        description: "Access quote list and details",
      },
      {
        key: "create_quotes",
        label: "Create Quotes",
        description: "Create new quotes",
      },
      {
        key: "approve_quotes",
        label: "Approve Quotes",
        description: "Approve and finalize quotes",
      },
      {
        key: "engineering_review",
        label: "Engineering Review",
        description: "Access engineering review features",
      },
      {
        key: "view_quote_analytics",
        label: "View Quote Analytics",
        description: "Access quote analytics and reporting",
      },
      {
        key: "manage_disclaimers",
        label: "Manage Disclaimers",
        description: "Create and edit quote disclaimers",
      },
    ],
  },
  projectManagement: {
    label: "Project Management",
    permissions: [
      {
        key: "view_floor_plans",
        label: "View Floor Plans",
        description: "Access floor plan viewer",
      },
      {
        key: "edit_floor_plans",
        label: "Edit Floor Plans",
        description: "Modify floor plans and annotations",
      },
      {
        key: "view_lidar",
        label: "View LiDAR",
        description: "Access LiDAR scan data",
      },
      {
        key: "manage_lidar",
        label: "Manage LiDAR",
        description: "Upload and manage LiDAR scans",
      },
      {
        key: "view_ar_measurements",
        label: "View AR Measurements",
        description: "Access AR measurement data",
      },
      {
        key: "view_wiring_diagrams",
        label: "View Wiring Diagrams",
        description: "Access wiring diagrams",
      },
      {
        key: "view_change_orders",
        label: "View Change Orders",
        description: "Access change order list",
      },
      {
        key: "create_change_orders",
        label: "Create Change Orders",
        description: "Create new change orders",
      },
      {
        key: "approve_change_orders",
        label: "Approve Change Orders",
        description: "Approve and finalize change orders",
      },
    ],
  },
  reviewTools: {
    label: "Review Tools",
    permissions: [
      {
        key: "use_ai_assistant",
        label: "Use AI Assistant",
        description: "Access AI-powered assistant features",
      },
      {
        key: "view_recommendations",
        label: "View Recommendations",
        description: "Access hardware recommendations",
      },
      {
        key: "use_computer_vision",
        label: "Use Computer Vision",
        description: "Access computer vision analysis",
      },
      {
        key: "use_document_intelligence",
        label: "Use Document Intelligence",
        description: "Access document AI features",
      },
      {
        key: "view_reference",
        label: "View Reference",
        description: "Access reference library and code reference",
      },
    ],
  },
  purchasing: {
    label: "Purchasing",
    permissions: [
      {
        key: "view_purchase_orders",
        label: "View Purchase Orders",
        description: "Access purchase order list",
      },
      {
        key: "create_purchase_orders",
        label: "Create Purchase Orders",
        description: "Create new purchase orders",
      },
      {
        key: "approve_purchase_orders",
        label: "Approve Purchase Orders",
        description: "Approve and finalize purchase orders",
      },
      {
        key: "view_manufacturers",
        label: "View Manufacturers",
        description: "Access manufacturer list",
      },
      {
        key: "manage_manufacturers",
        label: "Manage Manufacturers",
        description: "Add and edit manufacturers",
      },
      {
        key: "view_distributors",
        label: "View Distributors",
        description: "Access distributor list",
      },
      {
        key: "manage_distributors",
        label: "Manage Distributors",
        description: "Add and edit distributors",
      },
    ],
  },
  analytics: {
    label: "Analytics",
    permissions: [
      {
        key: "view_analytics",
        label: "View Analytics",
        description: "Access analytics dashboard",
      },
      {
        key: "view_reports",
        label: "View Reports",
        description: "Access report generation",
      },
      {
        key: "view_performance",
        label: "View Performance",
        description: "Access performance metrics",
      },
      {
        key: "view_competitive",
        label: "View Competitive",
        description: "Access competitive analysis",
      },
    ],
  },
  company: {
    label: "Company",
    permissions: [
      {
        key: "view_customers",
        label: "View Customers",
        description: "Access customer list",
      },
      {
        key: "manage_customers",
        label: "Manage Customers",
        description: "Add and edit customers",
      },
      {
        key: "view_sales_pipeline",
        label: "View Sales Pipeline",
        description: "Access sales pipeline",
      },
      {
        key: "manage_sales_pipeline",
        label: "Manage Sales Pipeline",
        description: "Edit sales pipeline stages and deals",
      },
      {
        key: "view_scheduling",
        label: "View Scheduling",
        description: "Access scheduling calendar",
      },
      {
        key: "manage_scheduling",
        label: "Manage Scheduling",
        description: "Create and edit scheduled events",
      },
      {
        key: "view_marketing",
        label: "View Marketing",
        description: "Access marketing features",
      },
      {
        key: "manage_marketing",
        label: "Manage Marketing",
        description: "Create and edit marketing campaigns",
      },
      {
        key: "view_team",
        label: "View Team",
        description: "Access team member list",
      },
      {
        key: "manage_team",
        label: "Manage Team",
        description: "Add and edit team members and roles",
      },
      {
        key: "view_branding",
        label: "View Branding",
        description: "Access branding settings",
      },
      {
        key: "manage_branding",
        label: "Manage Branding",
        description: "Edit company branding",
      },
      {
        key: "view_roadmap",
        label: "View Roadmap",
        description: "Access product roadmap",
      },
      {
        key: "view_integrations",
        label: "View Integrations",
        description: "Access integration settings",
      },
      {
        key: "manage_integrations",
        label: "Manage Integrations",
        description: "Configure third-party integrations",
      },
      {
        key: "import_data",
        label: "Import Data",
        description: "Import data from external sources",
      },
      {
        key: "export_data",
        label: "Export Data",
        description: "Export data to external formats",
      },
      {
        key: "view_hr_onboarding",
        label: "View HR Onboarding",
        description: "Access HR onboarding plans and employee progress",
      },
      {
        key: "manage_hr_onboarding",
        label: "Manage HR Onboarding",
        description: "Create and edit onboarding plans and assign employees",
      },
      {
        key: "manage_hr_integrations",
        label: "Manage HR Integrations",
        description: "Configure HR software integrations (BambooHR, Workday, ADP)",
      },
    ],
  },
  settings: {
    label: "Settings",
    permissions: [
      {
        key: "view_settings",
        label: "View Settings",
        description: "Access account settings",
      },
      {
        key: "manage_settings",
        label: "Manage Settings",
        description: "Modify account settings",
      },
      {
        key: "view_profile",
        label: "View Profile",
        description: "Access user profile",
      },
      {
        key: "manage_profile",
        label: "Manage Profile",
        description: "Edit user profile",
      },
      {
        key: "view_billing",
        label: "View Billing",
        description: "Access billing information",
      },
      {
        key: "manage_billing",
        label: "Manage Billing",
        description: "Manage subscription and billing",
      },
      {
        key: "manage_trial_settings",
        label: "Manage Trial Settings",
        description: "Configure trial period settings",
      },
      {
        key: "submit_bug_reports",
        label: "Submit Bug Reports",
        description: "Report bugs and issues",
      },
    ],
  },
  helpSupport: {
    label: "Help & Support",
    permissions: [
      {
        key: "view_help",
        label: "View Help",
        description: "Access help center and documentation",
      },
    ],
  },
};

export const CATEGORY_ORDER: FeatureCategory[] = [
  "dashboard",
  "estimating",
  "quotes",
  "projectManagement",
  "reviewTools",
  "purchasing",
  "analytics",
  "company",
  "settings",
  "helpSupport",
];

export function getRolePermissionCount(role: MembershipRole): number {
  return DEFAULT_ROLE_PERMISSIONS[role]?.length || 0;
}

export function getCategoryPermissions(category: FeatureCategory): FeaturePermission[] {
  return PERMISSION_CATEGORIES[category]?.permissions.map((p) => p.key) || [];
}

export function getPermissionCategory(permission: FeaturePermission): FeatureCategory | null {
  for (const [category, data] of Object.entries(PERMISSION_CATEGORIES)) {
    if (data.permissions.some((p) => p.key === permission)) {
      return category as FeatureCategory;
    }
  }
  return null;
}

export function getPermissionLabel(permission: FeaturePermission): string {
  for (const data of Object.values(PERMISSION_CATEGORIES)) {
    const found = data.permissions.find((p) => p.key === permission);
    if (found) return found.label;
  }
  return permission.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function getPermissionDescription(permission: FeaturePermission): string {
  for (const data of Object.values(PERMISSION_CATEGORIES)) {
    const found = data.permissions.find((p) => p.key === permission);
    if (found) return found.description;
  }
  return "";
}

export function compareRoles(roleA: MembershipRole, roleB: MembershipRole): number {
  const countA = getRolePermissionCount(roleA);
  const countB = getRolePermissionCount(roleB);
  return countB - countA;
}

export const MEMBERSHIP_ROLES_LIST: MembershipRole[] = [
  "owner",
  "admin",
  "pm_manager",
  "manager",
  "project_manager",
  "engineer",
  "sales_rep",
  "procurement_officer",
  "technician",
  "viewer",
];
