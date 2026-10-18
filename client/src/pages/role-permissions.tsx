import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useRolePermissions } from "@/hooks/use-role-permissions";
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Copy,
  Shield,
  ShieldCheck,
  Crown,
  Briefcase,
  ClipboardList,
  Wrench,
  DollarSign,
  ShoppingCart,
  HardHat,
  Eye,
  Lock,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import {
  type MembershipRole,
  type FeaturePermission,
  type FeatureCategory,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATEGORIES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ALL_PERMISSIONS,
} from "@shared/permissions";

const ROLE_ORDER: MembershipRole[] = [
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

const ROLE_ICONS: Record<MembershipRole, any> = {
  owner: Crown,
  admin: ShieldCheck,
  pm_manager: ClipboardList,
  manager: Briefcase,
  project_manager: ClipboardList,
  engineer: Wrench,
  sales_rep: DollarSign,
  procurement_officer: ShoppingCart,
  technician: HardHat,
  viewer: Eye,
};

const PERMISSION_DEPENDENCIES: Record<FeaturePermission, FeaturePermission[]> = {
  create_projects: ["view_projects"],
  edit_projects: ["view_projects"],
  delete_projects: ["view_projects"],
  manage_templates: ["view_templates"],
  manage_costs: ["view_costs"],
  manage_hardware_schedule: ["view_hardware_schedule"],
  manage_catalog: ["view_catalog"],
  import_catalog: ["view_catalog"],
  manage_bundles: ["view_bundles"],
  manage_keying: ["view_keying"],
  create_quotes: ["view_quotes"],
  approve_quotes: ["view_quotes"],
  engineering_review: ["view_quotes"],
  view_quote_analytics: ["view_quotes"],
  manage_disclaimers: ["view_quotes"],
  edit_floor_plans: ["view_floor_plans"],
  manage_lidar: ["view_lidar"],
  create_change_orders: ["view_change_orders"],
  approve_change_orders: ["view_change_orders"],
  create_purchase_orders: ["view_purchase_orders"],
  approve_purchase_orders: ["view_purchase_orders"],
  manage_manufacturers: ["view_manufacturers"],
  manage_distributors: ["view_distributors"],
  manage_customers: ["view_customers"],
  manage_sales_pipeline: ["view_sales_pipeline"],
  manage_scheduling: ["view_scheduling"],
  manage_marketing: ["view_marketing"],
  manage_team: ["view_team"],
  manage_branding: ["view_branding"],
  manage_integrations: ["view_integrations"],
  manage_settings: ["view_settings"],
  manage_profile: ["view_profile"],
  manage_billing: ["view_billing"],
} as Record<FeaturePermission, FeaturePermission[]>;

function arraysEqual(a: FeaturePermission[], b: FeaturePermission[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

export default function RolePermissions() {
  const { toast } = useToast();
  const {
    permissions: apiPermissions,
    isLoading,
    error,
    save,
    saveAsync,
    isSaving,
    resetRoleAsync,
    isResetting,
    customizedRoles,
  } = useRolePermissions();

  const [selectedRole, setSelectedRole] = useState<MembershipRole>("pm_manager");
  const [customPermissions, setCustomPermissions] = useState<Record<MembershipRole, FeaturePermission[]>>(DEFAULT_ROLE_PERMISSIONS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [copyFromRole, setCopyFromRole] = useState<MembershipRole | "">("");

  useEffect(() => {
    if (apiPermissions && !isLoading) {
      setCustomPermissions(apiPermissions as Record<MembershipRole, FeaturePermission[]>);
    }
  }, [apiPermissions, isLoading]);

  const isRoleReadOnly = (role: MembershipRole): boolean => {
    return role === "owner" || role === "admin";
  };

  const isRoleModified = (role: MembershipRole): boolean => {
    if (isRoleReadOnly(role)) return false;
    return !arraysEqual(customPermissions[role], DEFAULT_ROLE_PERMISSIONS[role]);
  };

  const getPermissionCount = (role: MembershipRole): number => {
    return customPermissions[role]?.length || 0;
  };

  const hasPermission = (role: MembershipRole, permission: FeaturePermission): boolean => {
    return customPermissions[role]?.includes(permission) || false;
  };

  const isDependencyMissing = (role: MembershipRole, permission: FeaturePermission): boolean => {
    const deps = PERMISSION_DEPENDENCIES[permission];
    if (!deps) return false;
    return deps.some((dep) => !hasPermission(role, dep));
  };

  const getDependencyInfo = (permission: FeaturePermission): string | null => {
    const deps = PERMISSION_DEPENDENCIES[permission];
    if (!deps || deps.length === 0) return null;
    const depLabels = deps.map((dep) => {
      for (const category of Object.values(PERMISSION_CATEGORIES)) {
        const perm = category.permissions.find((p) => p.key === dep);
        if (perm) return perm.label;
      }
      return dep;
    });
    return `Requires: ${depLabels.join(", ")}`;
  };

  const togglePermission = (role: MembershipRole, permission: FeaturePermission) => {
    if (isRoleReadOnly(role)) return;

    setCustomPermissions((prev) => {
      const currentPerms = [...(prev[role] || [])];
      const hasIt = currentPerms.includes(permission);

      if (hasIt) {
        const dependentPerms = Object.entries(PERMISSION_DEPENDENCIES)
          .filter(([_, deps]) => deps.includes(permission))
          .map(([perm, _]) => perm as FeaturePermission);

        const newPerms = currentPerms.filter(
          (p) => p !== permission && !dependentPerms.includes(p)
        );

        return {
          ...prev,
          [role]: newPerms,
        };
      } else {
        const deps = PERMISSION_DEPENDENCIES[permission] || [];
        const combined = [...currentPerms, permission, ...deps];
        const newPerms = Array.from(new Set(combined));

        return {
          ...prev,
          [role]: newPerms,
        };
      }
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      const permissionsToSave: Record<string, string[]> = {};
      for (const role of ROLE_ORDER) {
        if (!isRoleReadOnly(role)) {
          permissionsToSave[role] = customPermissions[role];
        }
      }
      await saveAsync(permissionsToSave);
      setHasUnsavedChanges(false);
      toast({
        title: "Permissions Saved",
        description: "Role permissions have been saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err?.message || "Failed to save role permissions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResetToDefault = async () => {
    if (isRoleReadOnly(selectedRole)) return;

    try {
      await resetRoleAsync(selectedRole);
      setCustomPermissions((prev) => ({
        ...prev,
        [selectedRole]: [...DEFAULT_ROLE_PERMISSIONS[selectedRole]],
      }));
      setResetDialogOpen(false);
      toast({
        title: "Permissions Reset",
        description: `${ROLE_LABELS[selectedRole]} permissions have been reset to defaults.`,
      });
    } catch (err: any) {
      toast({
        title: "Reset Failed",
        description: err?.message || "Failed to reset role permissions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyFrom = (sourceRole: MembershipRole) => {
    if (isRoleReadOnly(selectedRole)) return;
    if (!sourceRole) return;

    setCustomPermissions((prev) => ({
      ...prev,
      [selectedRole]: [...prev[sourceRole]],
    }));
    setHasUnsavedChanges(true);
    setCopyFromRole("");
    toast({
      title: "Permissions Copied",
      description: `Permissions copied from ${ROLE_LABELS[sourceRole]} to ${ROLE_LABELS[selectedRole]}.`,
    });
  };

  const categoryOrder: FeatureCategory[] = [
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

  const getCategoryPermissionCount = (
    role: MembershipRole,
    category: FeatureCategory
  ): { enabled: number; total: number } => {
    const categoryPerms = PERMISSION_CATEGORIES[category]?.permissions || [];
    const enabled = categoryPerms.filter((p) =>
      hasPermission(role, p.key)
    ).length;
    return { enabled, total: categoryPerms.length };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 sm:py-8 px-3 sm:px-6 max-w-6xl" data-testid="page-role-permissions-loading">
        <div className="mb-6">
          <Skeleton className="h-9 w-32 mb-4" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-32" />
            </CardHeader>
            <CardContent className="p-2">
              <div className="flex flex-col gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 sm:py-8 px-3 sm:px-6 max-w-6xl" data-testid="page-role-permissions-error">
        <div className="mb-6">
          <Link href="/team">
            <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-to-team">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Team
            </Button>
          </Link>
        </div>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Failed to Load Permissions
            </CardTitle>
            <CardDescription>
              {(error as any)?.message || "An error occurred while loading role permissions."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} data-testid="button-retry">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-8 px-3 sm:px-6 max-w-6xl" data-testid="page-role-permissions">
      <div className="mb-6">
        <Link href="/team">
          <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-to-team">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Team
          </Button>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Shield className="h-6 w-6" />
              Role Permissions
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Customize what each role can access in your organization
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Badge variant="outline" className="gap-1" data-testid="badge-unsaved-changes">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              data-testid="button-save-permissions"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1" data-testid="card-role-list">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Roles</CardTitle>
            <CardDescription className="text-xs">Select a role to configure</CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {ROLE_ORDER.map((role) => {
                const RoleIcon = ROLE_ICONS[role];
                const isReadOnly = isRoleReadOnly(role);
                const isModified = isRoleModified(role);
                const count = getPermissionCount(role);
                const isSelected = selectedRole === role;

                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    disabled={role === "owner"}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-md text-left w-full min-w-[140px] lg:min-w-0
                      transition-colors
                      ${isSelected ? "bg-primary text-primary-foreground" : "hover-elevate"}
                      ${role === "owner" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                    data-testid={`button-role-${role}`}
                  >
                    <RoleIcon className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium truncate flex-1">
                      {ROLE_LABELS[role]}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {isModified && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1 py-0"
                          data-testid={`badge-modified-${role}`}
                        >
                          Modified
                        </Badge>
                      )}
                      {isReadOnly ? (
                        <Badge variant="outline" className="text-[10px] px-1 py-0" data-testid={`badge-full-access-${role}`}>
                          <Lock className="h-2.5 w-2.5 mr-0.5" />
                          Full
                        </Badge>
                      ) : (
                        <Badge
                          variant={isSelected ? "secondary" : "outline"}
                          className="text-[10px] px-1.5 py-0"
                          data-testid={`badge-count-${role}`}
                        >
                          {count}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3" data-testid="card-permissions">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const RoleIcon = ROLE_ICONS[selectedRole];
                  return <RoleIcon className="h-5 w-5" />;
                })()}
                <div>
                  <CardTitle className="text-lg">{ROLE_LABELS[selectedRole]}</CardTitle>
                  <CardDescription className="text-sm">
                    {ROLE_DESCRIPTIONS[selectedRole]}
                  </CardDescription>
                </div>
              </div>
              {!isRoleReadOnly(selectedRole) && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={copyFromRole}
                    onValueChange={(val) => {
                      setCopyFromRole(val as MembershipRole);
                      if (val) handleCopyFrom(val as MembershipRole);
                    }}
                  >
                    <SelectTrigger className="w-[160px]" data-testid="select-copy-from">
                      <Copy className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Copy from..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_ORDER.filter((r) => r !== selectedRole).map((role) => (
                        <SelectItem
                          key={role}
                          value={role}
                          data-testid={`select-item-copy-${role}`}
                        >
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setResetDialogOpen(true)}
                    disabled={!isRoleModified(selectedRole) || isResetting}
                    data-testid="button-reset-to-default"
                  >
                    {isResetting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    Reset to Default
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isRoleReadOnly(selectedRole) ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-center"
                data-testid="full-access-message"
              >
                <ShieldCheck className="h-16 w-16 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">Full Access</h3>
                <p className="text-muted-foreground max-w-md">
                  {selectedRole === "owner"
                    ? "Owners have complete access to all features and cannot be restricted. This ensures organizational continuity and security."
                    : "Administrators have full access to all features. This role is designed for trusted users who manage the organization."}
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <Badge variant="default" className="gap-1">
                    <Check className="h-3 w-3" />
                    {ALL_PERMISSIONS.length} permissions enabled
                  </Badge>
                </div>
              </div>
            ) : (
              <Accordion
                type="multiple"
                className="w-full"
                defaultValue={categoryOrder}
              >
                {categoryOrder.map((categoryKey) => {
                  const category = PERMISSION_CATEGORIES[categoryKey];
                  if (!category) return null;

                  const { enabled, total } = getCategoryPermissionCount(
                    selectedRole,
                    categoryKey
                  );

                  return (
                    <AccordionItem
                      key={categoryKey}
                      value={categoryKey}
                      data-testid={`accordion-category-${categoryKey}`}
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="font-medium">{category.label}</span>
                          <Badge
                            variant={enabled === total ? "default" : "secondary"}
                            className="text-xs"
                            data-testid={`badge-category-count-${categoryKey}`}
                          >
                            {enabled}/{total}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {category.permissions.map((perm) => {
                            const isEnabled = hasPermission(selectedRole, perm.key);
                            const depMissing = isDependencyMissing(selectedRole, perm.key);
                            const depInfo = getDependencyInfo(perm.key);

                            return (
                              <div
                                key={perm.key}
                                className="flex items-start justify-between gap-4 py-2 px-3 rounded-md hover:bg-muted/50"
                                data-testid={`permission-row-${perm.key}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <Label
                                    htmlFor={`switch-${selectedRole}-${perm.key}`}
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    {perm.label}
                                  </Label>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {perm.description}
                                  </p>
                                  {depInfo && !isEnabled && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      {depInfo}
                                    </p>
                                  )}
                                </div>
                                <Switch
                                  id={`switch-${selectedRole}-${perm.key}`}
                                  checked={isEnabled}
                                  onCheckedChange={() =>
                                    togglePermission(selectedRole, perm.key)
                                  }
                                  disabled={depMissing && !isEnabled}
                                  data-testid={`switch-${perm.key}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent data-testid="dialog-reset-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default Permissions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all permissions for {ROLE_LABELS[selectedRole]} to their default
              values. Any customizations you've made will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-reset-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetToDefault}
              disabled={isResetting}
              data-testid="button-reset-confirm"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Permissions"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
