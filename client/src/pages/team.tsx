import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  UserPlus, 
  Shield, 
  AlertCircle, 
  User, 
  Mail, 
  UserCog, 
  UserMinus,
  Users,
  Crown,
  ShieldCheck,
  Briefcase,
  Wrench,
  Eye,
  Search,
  Building2,
  Star,
  Zap,
  ClipboardList,
  DollarSign,
  ShoppingCart,
  HardHat
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { UsageBadge, UsageAlert } from "@/components/usage-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

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

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Full control over organization, billing, and team",
  admin: "Manage team members and assign roles",
  pm_manager: "Oversight of all project managers with analytics",
  manager: "View team members and manage projects",
  project_manager: "Manage projects, procurement, and work assignments",
  engineer: "Approve quotes and perform engineering review",
  sales_rep: "Handle sales pipeline and proposal delivery",
  procurement_officer: "Manage purchasing and vendor relationships",
  technician: "Create and submit quotes for review",
  viewer: "View-only access to projects",
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

const ROLE_ICONS: Record<string, any> = {
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

const ROLE_ORDER = ["owner", "admin", "pm_manager", "manager", "project_manager", "engineer", "sales_rep", "procurement_officer", "technician", "viewer"];

const BUSINESS_SIZE_PRESETS = {
  solo: {
    label: "Solo Operator",
    description: "One person handling all responsibilities",
    defaultRoles: ["owner", "admin", "project_manager", "engineer", "sales_rep", "technician"],
  },
  small: {
    label: "Small Business",
    description: "2-10 employees with shared responsibilities",
    defaultRoles: ["project_manager", "engineer", "technician"],
  },
  medium: {
    label: "Medium Business",
    description: "10-50 employees with specialized roles",
    defaultRoles: ["project_manager"],
  },
  large: {
    label: "Large Corporation",
    description: "50+ employees with dedicated departments",
    defaultRoles: ["technician"],
  },
} as const;

type BusinessSize = keyof typeof BUSINESS_SIZE_PRESETS;

interface TeamUsageStats {
  current: number;
  limit: number | null;
  isUnlimited: boolean;
  percentUsed: number;
  remaining: number | null;
}

function RoleBadge({ role, memberId, isPrimary = false }: { role: string; memberId: string; isPrimary?: boolean }) {
  const RoleIcon = ROLE_ICONS[role] || User;
  return (
    <Badge 
      variant={ROLE_BADGE_VARIANTS[role] || "outline"}
      className="text-xs shrink-0 gap-1"
      data-testid={`badge-role-${role}-${memberId}`}
    >
      {isPrimary && <Star className="h-2.5 w-2.5 shrink-0 fill-current" />}
      <RoleIcon className="h-3 w-3 shrink-0" />
      {ROLE_LABELS[role] || role}
    </Badge>
  );
}

function RoleBadgeList({ roles, primaryRole, memberId }: { roles: string[]; primaryRole: string; memberId: string }) {
  const allRoles = [primaryRole, ...roles.filter(r => r !== primaryRole)];
  const uniqueRoles = Array.from(new Set(allRoles));
  const displayRoles = uniqueRoles.slice(0, 3);
  const hiddenCount = uniqueRoles.length - 3;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {displayRoles.map((role, index) => (
        <RoleBadge 
          key={role} 
          role={role} 
          memberId={memberId} 
          isPrimary={index === 0}
        />
      ))}
      {hiddenCount > 0 && (
        <Badge 
          variant="outline" 
          className="text-xs shrink-0"
          data-testid={`badge-more-roles-${memberId}`}
        >
          +{hiddenCount} more
        </Badge>
      )}
    </div>
  );
}

export default function Team() {
  const { toast } = useToast();
  const [editingMember, setEditingMember] = useState<any>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [deletingMember, setDeletingMember] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastKnownUsage, setLastKnownUsage] = useState<TeamUsageStats | null>(null);
  const [selectedBusinessSize, setSelectedBusinessSize] = useState<BusinessSize>("medium");

  const { data: user, isLoading: userLoading, isError: userError, error: userErrorDetails, refetch: refetchUser } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const { data: members, isLoading: membersLoading, isError: membersError, error: membersErrorDetails, refetch: refetchMembers } = useQuery<any>({
    queryKey: ["/api/team/members"],
    enabled: !!user && (user.role === "owner" || user.role === "admin" || user.role === "manager"),
  });

  const { data: usageStats, isLoading: usageLoading, isError: usageError, isFetching: usageFetching, refetch: refetchUsage } = useQuery<TeamUsageStats>({
    queryKey: ["/api/team/usage"],
    enabled: !!user && (user.role === "owner" || user.role === "admin" || user.role === "manager"),
  });

  useEffect(() => {
    if (usageStats) {
      setLastKnownUsage(usageStats);
    }
  }, [usageStats]);

  useEffect(() => {
    if (editingMember) {
      const memberRoles = editingMember.roles || [];
      const allRoles = [editingMember.role, ...memberRoles];
      setSelectedRoles(Array.from(new Set(allRoles)));
    }
  }, [editingMember]);

  const updateRolesMutation = useMutation({
    mutationFn: async ({ membershipId, roles }: { membershipId: string; roles: string[] }) => {
      const res = await apiRequest("PATCH", `/api/team/members/${membershipId}/roles`, { roles });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      setEditingMember(null);
      setSelectedRoles([]);
      toast({
        title: "Success",
        description: "Team member roles updated successfully. New permissions are now in effect.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update roles",
        description: error.message || "Unable to change roles. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateSelfRolesMutation = useMutation({
    mutationFn: async ({ roles }: { roles: string[] }) => {
      const currentMembership = members?.find((m: any) => m.userId === user?.id);
      if (!currentMembership) throw new Error("Current membership not found");
      const res = await apiRequest("PATCH", `/api/team/members/${currentMembership.id}/roles`, { roles });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Your roles have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update roles",
        description: error.message || "Unable to update your roles. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      const res = await apiRequest("DELETE", `/api/team/members/${membershipId}`);
      return res.json();
    },
    onSuccess: async () => {
      try {
        if (lastKnownUsage) {
          const newCurrent = lastKnownUsage.current - 1;
          const newRemaining = lastKnownUsage.limit === null 
            ? null 
            : Math.max(0, lastKnownUsage.limit - newCurrent);
          const newPercentUsed = lastKnownUsage.limit === null || lastKnownUsage.limit === 0
            ? 0
            : Math.round((newCurrent / lastKnownUsage.limit) * 100);
          
          setLastKnownUsage({
            ...lastKnownUsage,
            current: newCurrent,
            remaining: newRemaining,
            percentUsed: newPercentUsed,
          });
        }
        
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/team/members"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/team/usage"] }),
        ]);
        await refetchUsage();
        
        setDeletingMember(null);
        toast({
          title: "Success",
          description: "Team member removed successfully. Their access has been revoked.",
        });
      } catch (error) {
        setDeletingMember(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove team member",
        description: error.message || "This member cannot be removed. They may own resources or have pending tasks.",
        variant: "destructive",
      });
    },
  });

  const isLoading = userLoading || membersLoading || usageLoading;

  if (userError) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to load user information"
            message={userErrorDetails instanceof Error ? userErrorDetails.message : "Unable to fetch your user information. Please check your connection and try again."}
            error={userErrorDetails as Error}
            onRetry={refetchUser}
            testId="error-user"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (membersError && user && (user.role === "owner" || user.role === "admin" || user.role === "manager")) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <ErrorState
            title="Failed to load team members"
            message={membersErrorDetails instanceof Error ? membersErrorDetails.message : "Unable to fetch team members. Please check your connection and try again."}
            error={membersErrorDetails as Error}
            onRetry={refetchMembers}
            testId="error-team-members"
            fullPage
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" data-testid="loading-team">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const canManageTeam = user && (user.role === "owner" || user.role === "admin" || user.role === "manager");
  
  if (!user || !canManageTeam) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl" data-testid="page-team-unauthorized">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-destructive" />
              <div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>You do not have permission to view team members. Manager role or higher is required.</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  const canEditMembers = user.role === "owner" || user.role === "admin";
  const currentUserMembership = members?.find((m: any) => m.userId === user.id);
  const currentUserRoles = currentUserMembership 
    ? [currentUserMembership.role, ...(currentUserMembership.roles || [])]
    : [user.role];
  const uniqueCurrentUserRoles = Array.from(new Set(currentUserRoles));

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  const filteredMembers = members?.filter((member: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${member.user.firstName} ${member.user.lastName}`.toLowerCase();
    const email = (member.user.email || "").toLowerCase();
    const memberRoles = [member.role, ...(member.roles || [])];
    const roleLabels = memberRoles.map(r => ROLE_LABELS[r]?.toLowerCase() || r.toLowerCase()).join(" ");
    return fullName.includes(searchLower) || email.includes(searchLower) || roleLabels.includes(searchLower);
  }) || [];

  const effectiveUsage = usageError ? lastKnownUsage : (usageStats || lastKnownUsage);
  const isAtLimit = effectiveUsage && !effectiveUsage.isUnlimited && effectiveUsage.limit !== null && effectiveUsage.current >= effectiveUsage.limit;
  const disableInvite = !effectiveUsage || usageLoading || !!isAtLimit;

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== role);
      }
      return [...prev, role];
    });
  };

  const handleQuickAssignAll = () => {
    const allAssignableRoles = ROLE_ORDER.filter(r => 
      r !== "owner" || user.role === "owner"
    );
    setSelectedRoles(allAssignableRoles);
  };

  const handleQuickAssignPmEngineer = () => {
    setSelectedRoles(["project_manager", "engineer"]);
  };

  const handleQuickAssignField = () => {
    setSelectedRoles(["technician", "viewer"]);
  };

  const handleAssignAllToMe = () => {
    const allRolesForSolo = [...BUSINESS_SIZE_PRESETS.solo.defaultRoles];
    updateSelfRolesMutation.mutate({ roles: allRolesForSolo });
  };

  const getAvailableRolesForEdit = () => {
    return ROLE_ORDER.filter(role => {
      if (role === "owner" && user.role !== "owner") return false;
      return true;
    });
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 px-3 sm:px-6 max-w-6xl" data-testid="page-team">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:gap-3 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-team-title">Team Management</h1>
            {effectiveUsage && (
              <UsageBadge
                current={effectiveUsage.current}
                limit={effectiveUsage.limit}
                isUnlimited={effectiveUsage.isUnlimited}
                percentUsed={effectiveUsage.percentUsed}
                resourceName="team members"
              />
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Link href="/role-permissions">
              <Button 
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                data-testid="button-role-permissions"
              >
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                <span className="text-xs sm:text-sm">Permissions</span>
              </Button>
            </Link>
            <Button 
              className="w-full sm:w-auto"
              size="sm"
              data-testid="button-invite-member" 
              disabled={disableInvite}
            >
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
              <span className="text-xs sm:text-sm">Invite Member</span>
            </Button>
          </div>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your team members and their roles</p>
      </div>

      {effectiveUsage && (
        <UsageAlert
          current={effectiveUsage.current}
          limit={effectiveUsage.limit}
          isUnlimited={effectiveUsage.isUnlimited}
          percentUsed={effectiveUsage.percentUsed}
          resourceName="team members"
          upgradeLink="/billing"
        />
      )}
      
      {usageError && !lastKnownUsage && (
        <Alert variant="destructive" data-testid="alert-usage-error" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Unable to Load Team Member Limits</p>
              <p className="text-sm">
                We couldn't retrieve your subscription limits. Please try again.
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => refetchUsage()}
              data-testid="button-retry-usage"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {usageError && lastKnownUsage && (
        <Alert variant="default" data-testid="alert-usage-warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Using Cached Team Member Data</p>
              <p className="text-sm">
                We're having trouble refreshing your limits, but you can still manage your team using the last known data.
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => refetchUsage()}
              data-testid="button-retry-usage-warning"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {canEditMembers && (
        <Card className="mb-6 sm:mb-8" data-testid="card-my-roles">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <User className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              My Roles
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Your current role assignments and quick actions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {uniqueCurrentUserRoles.map((role, index) => {
                  const RoleIcon = ROLE_ICONS[role] || User;
                  return (
                    <Badge 
                      key={role}
                      variant={ROLE_BADGE_VARIANTS[role] || "outline"}
                      className="gap-1"
                    >
                      {index === 0 && <Star className="h-3 w-3 shrink-0 fill-current" />}
                      <RoleIcon className="h-3 w-3 shrink-0" />
                      {ROLE_LABELS[role] || role}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAssignAllToMe}
                  disabled={updateSelfRolesMutation.isPending}
                  data-testid="button-assign-all-to-me"
                >
                  {updateSelfRolesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Zap className="h-4 w-4 mr-2 shrink-0" />
                  Assign All Roles to Me
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 sm:mb-8" data-testid="card-org-size-selector">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            Organization Size
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Select your organization size to help configure default role presets for new members
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <RadioGroup
            value={selectedBusinessSize}
            onValueChange={(value) => setSelectedBusinessSize(value as BusinessSize)}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {Object.entries(BUSINESS_SIZE_PRESETS).map(([key, preset]) => (
              <div key={key} className="relative">
                <RadioGroupItem
                  value={key}
                  id={`size-${key}`}
                  className="peer sr-only"
                  data-testid={`radio-size-${key}`}
                />
                <Label
                  htmlFor={`size-${key}`}
                  className="flex flex-col p-4 rounded-lg border cursor-pointer hover-elevate peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedBusinessSize(key as BusinessSize);
                    }
                  }}
                >
                  <span className="font-medium text-sm">{preset.label}</span>
                  <span className="text-xs text-muted-foreground mt-1">{preset.description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="mb-6 sm:mb-8" data-testid="card-role-info">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            Role Hierarchy
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Each role has specific permissions and access levels</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {ROLE_ORDER.map((role) => {
              const RoleIcon = ROLE_ICONS[role];
              return (
                <div key={role} className="p-3 sm:p-4 rounded-lg border hover-elevate" data-testid={`card-role-${role}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={ROLE_BADGE_VARIANTS[role]} className="shrink-0">
                      <RoleIcon className="h-3 w-3 mr-1 shrink-0" />
                      {ROLE_LABELS[role]}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {ROLE_DESCRIPTIONS[role]}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-team-members">
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Team Members</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {filteredMembers.length} of {members?.length || 0} member{members?.length !== 1 ? "s" : ""} in your organization
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
                data-testid="input-search-members"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        <span className="text-xs sm:text-sm">Member</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        <span className="text-xs sm:text-sm">Email</span>
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2 min-w-0">
                        <Shield className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        <span className="text-xs sm:text-sm">Roles</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member: any) => (
                    <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                      <TableCell className="py-2 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                            <AvatarImage src={member.user.profileImageUrl} />
                            <AvatarFallback className="text-xs sm:text-sm">
                              {getInitials(member.user.firstName, member.user.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium text-sm sm:text-base truncate" data-testid={`text-member-name-${member.id}`}>
                              {member.user.firstName} {member.user.lastName}
                            </div>
                            {member.userId === user.id && (
                              <Badge variant="outline" className="mt-1 text-xs shrink-0">You</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4 text-xs sm:text-sm" data-testid={`text-member-email-${member.id}`}>
                        {member.user.email}
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        <RoleBadgeList 
                          roles={member.roles || []}
                          primaryRole={member.role}
                          memberId={member.id}
                        />
                      </TableCell>
                      <TableCell className="text-right py-2 sm:py-4">
                        {canEditMembers ? (
                          <TooltipProvider>
                            <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
                              {member.role !== "owner" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingMember(member);
                                      }}
                                      data-testid={`button-edit-role-${member.id}`}
                                    >
                                      <UserCog className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                                      <span className="text-xs sm:text-sm hidden sm:inline">Change Roles</span>
                                      <span className="text-xs sm:hidden">Edit</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Update this member's roles and permissions</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {member.role !== "owner" && member.userId !== user.id && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setDeletingMember(member)}
                                      data-testid={`button-remove-${member.id}`}
                                    >
                                      <UserMinus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                                      <span className="text-xs sm:text-sm">Remove</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Remove this member from the organization</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs sm:text-sm text-muted-foreground">View only</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!filteredMembers || filteredMembers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 sm:py-12">
                        <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 text-muted-foreground">
                          <Users className="h-8 w-8 sm:h-12 sm:w-12 opacity-50 shrink-0" />
                          <div>
                            <p className="font-medium text-sm sm:text-base">
                              {searchTerm ? "No members found" : "No team members yet"}
                            </p>
                            <p className="text-xs sm:text-sm">
                              {searchTerm ? "Try adjusting your search" : "Invite members to get started"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-edit-role">
          <DialogHeader>
            <DialogTitle>Change Member Roles</DialogTitle>
            <DialogDescription>
              Update the roles for {editingMember?.user.firstName} {editingMember?.user.lastName}. Select one or more roles.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <label className="text-sm font-medium mb-3 block">Quick Assign Presets</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleQuickAssignAll}
                  data-testid="button-quick-assign-all"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  All Roles
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleQuickAssignPmEngineer}
                  data-testid="button-quick-assign-pm-engineer"
                >
                  PM & Engineer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleQuickAssignField}
                  data-testid="button-quick-assign-field"
                >
                  Field Only
                </Button>
              </div>
            </div>
            <label className="text-sm font-medium mb-3 block">Select Roles</label>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {getAvailableRolesForEdit().map((role) => {
                const RoleIcon = ROLE_ICONS[role] || User;
                const isChecked = selectedRoles.includes(role);
                return (
                  <div key={role} className="flex items-start gap-3">
                    <Checkbox
                      id={`role-${role}`}
                      checked={isChecked}
                      onCheckedChange={() => handleRoleToggle(role)}
                      disabled={selectedRoles.length === 1 && isChecked}
                      data-testid={`checkbox-role-${role}`}
                    />
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={`role-${role}`} 
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Badge variant={ROLE_BADGE_VARIANTS[role]} className="shrink-0 gap-1">
                          <RoleIcon className="h-3 w-3" />
                          {ROLE_LABELS[role]}
                        </Badge>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ROLE_DESCRIPTIONS[role]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingMember(null)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingMember && selectedRoles.length > 0) {
                  updateRolesMutation.mutate({
                    membershipId: editingMember.id,
                    roles: selectedRoles,
                  });
                }
              }}
              disabled={updateRolesMutation.isPending || selectedRoles.length === 0}
              data-testid="button-confirm-edit"
            >
              {updateRolesMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingMember} onOpenChange={(open) => !open && setDeletingMember(null)}>
        <DialogContent data-testid="dialog-delete-member">
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {deletingMember?.user.firstName} {deletingMember?.user.lastName} from your organization?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                This action cannot be undone. The member will lose access to all projects and data.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingMember(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingMember) {
                  deleteMemberMutation.mutate(deletingMember.id);
                }
              }}
              disabled={deleteMemberMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMemberMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
