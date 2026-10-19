import { useUser } from "@clerk/react";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import { SessionManagement } from "@/components/security/session-management";
import { EmailVerificationStatus } from "@/components/security/email-verification-status";
import { useState, useEffect } from "react";
import { 
  User, 
  Building2, 
  Shield, 
  Bell, 
  Palette, 
  Activity,
  Save,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  TrendingUp,
  FolderOpen,
  DollarSign,
  Camera,
  Loader2,
  Edit,
  X,
  Upload,
  Key,
  Settings,
  CreditCard,
  Users,
  Hash,
  AlertTriangle,
  Database,
  Clock,
  Server,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ruler, Languages } from "lucide-react";
import type { ScanConfig } from "@shared/schema";
import { useTranslation } from 'react-i18next';
import { COMPANY_EMAILS } from "@shared/emails";

interface UserPreferences {
  emailNotifications: boolean;
  projectUpdates: boolean;
  quoteAlerts: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
}

interface InfrastructureHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  cache: {
    backend: string;
    healthy: boolean;
  };
  queue: {
    backend: string;
    healthy: boolean;
  };
}

interface CacheStats {
  backend: string;
  totalEntries: number;
  activeEntries: number;
  memoryEstimate: string;
}

interface QueueStats {
  backend: string;
  totalJobs: number;
  totalActive: number;
  totalWaiting: number;
  totalCompleted: number;
  totalFailed: number;
}

interface ApplicationMetrics {
  application: {
    uptime: {
      formatted: string;
      seconds: number;
    };
    nodeVersion: string;
    memory: {
      usedMB: number;
      totalMB: number;
      percentage: number;
    };
  };
  cache: {
    entries: number;
    backend: string;
    hitRate: number;
    totalRequests: number;
  };
}

export default function Profile() {
  const { user: clerkUser } = useUser();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
  });

  // Sync form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
    }
  }, [user]);

  const { 
    data: stats,
    isError: statsError,
    error: statsErrorObj,
    refetch: refetchStats
  } = useQuery<any>({
    queryKey: ["/api/user/stats"],
    enabled: !!user,
  });

  const { 
    data: preferences,
    isError: preferencesError,
    error: preferencesErrorObj,
    refetch: refetchPreferences
  } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    enabled: !!user,
    placeholderData: {
      emailNotifications: true,
      projectUpdates: true,
      quoteAlerts: true,
      weeklyDigest: false,
      marketingEmails: false,
    },
  });

  // Infrastructure Health Queries
  const { 
    data: health, 
    isLoading: healthLoading,
    refetch: refetchHealth
  } = useQuery<InfrastructureHealth>({
    queryKey: ["/api/infrastructure/health"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { 
    data: cacheStats, 
    isLoading: cacheLoading,
    refetch: refetchCache
  } = useQuery<CacheStats>({
    queryKey: ["/api/infrastructure/cache"],
    refetchInterval: 5000,
  });

  const { 
    data: queueStats, 
    isLoading: queueLoading,
    refetch: refetchQueue
  } = useQuery<QueueStats>({
    queryKey: ["/api/infrastructure/queue"],
    refetchInterval: 5000,
  });

  const { 
    data: metrics, 
    isLoading: metricsLoading,
    refetch: refetchMetrics
  } = useQuery<ApplicationMetrics>({
    queryKey: ["/api/infrastructure/metrics"],
    refetchInterval: 5000,
  });

  // Scan Config Query
  const { 
    data: scanConfig,
    isError: scanConfigError,
    error: scanConfigErrorObj,
    isLoading: scanConfigLoading,
    isFetching: scanConfigFetching,
    refetch: refetchScanConfig
  } = useQuery<ScanConfig>({
    queryKey: ["/api/organizations", user?.organization?.id, "scan-config"],
    enabled: !!user?.organization?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: async () => {
      await clerkUser?.reload();
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated successfully",
        description: "Your personal information has been saved",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to update profile",
        description: errorMessage.includes("validation")
          ? "Please check that all fields are filled correctly"
          : errorMessage || "Unable to save profile changes. Please try again",
        variant: "destructive",
      });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: Partial<UserPreferences>) => {
      const response = await apiRequest("PATCH", "/api/user/preferences", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update preferences");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your notification settings have been updated",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to save preferences",
        description: errorMessage || "Unable to update notification settings. Please try again",
        variant: "destructive",
      });
    },
  });

  const updateScanConfigMutation = useMutation({
    mutationFn: async (data: Partial<ScanConfig>) => {
      if (!user?.organization?.id) {
        throw new Error("No organization found");
      }
      // Fetch latest config to avoid stale data issues
      const { data: latestConfig } = await refetchScanConfig();
      if (!latestConfig) {
        throw new Error("Scan configuration not loaded yet");
      }
      // Merge with latest config to send complete payload with all server fields
      const fullConfig = {
        ...latestConfig,
        ...data,
      };
      const response = await apiRequest("PUT", `/api/organizations/${user.organization.id}/scan-config`, fullConfig);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update measurement preferences");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", user?.organization?.id, "scan-config"] });
      toast({
        title: "Measurement preferences saved",
        description: "Your measurement system has been updated",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to save measurement preferences",
        description: errorMessage || "Unable to update measurement system. Please try again",
        variant: "destructive",
      });
    },
  });

  const updateLanguageMutation = useMutation({
    mutationFn: async (language: string) => {
      const response = await apiRequest("PATCH", "/api/user/language", { language });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update language preference");
      }
      return response.json();
    },
    onSuccess: (_data, language) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      // Update i18n language
      i18n.changeLanguage(language);
      toast({
        title: "Language preferences saved",
        description: "Your language preference has been updated",
      });
    },
    onError: (error: Error) => {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Failed to save language preference",
        description: errorMessage || "Unable to update language preference. Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const togglePreference = (key: keyof UserPreferences) => {
    if (preferences) {
      updatePreferencesMutation.mutate({
        [key]: !preferences[key],
      });
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return `${first}${last}`.toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  const getRoleBadgeVariant = (role: string | null) => {
    if (role === "owner" || role === "admin") return "default";
    if (role === "manager" || role === "engineer") return "secondary";
    return "outline";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6">
              <div className="relative group shrink-0">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xl sm:text-2xl font-semibold bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-0 right-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Change avatar"
                      data-testid="button-change-avatar"
                    >
                      <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upload Photo</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate" data-testid="text-user-name">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.email}
                  </h1>
                  {user.role && (
                    <Badge variant={getRoleBadgeVariant(user.role)} className="shrink-0 w-fit" data-testid="badge-user-role">
                      <Shield className="h-3 w-3 mr-1 shrink-0" />
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate" data-testid="text-user-email">{user.email}</span>
                  </div>
                  {user.organization && (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span className="truncate" data-testid="text-user-organization">{user.organization.name}</span>
                    </div>
                  )}
                </div>

                {statsError ? (
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 border rounded-md bg-destructive/10">
                    <p className="text-xs sm:text-sm text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                      <span className="min-w-0">Failed to load activity stats</span>
                      <Button variant="ghost" size="sm" onClick={() => refetchStats()} className="ml-auto h-auto p-0 text-xs sm:text-sm text-destructive hover:text-destructive shrink-0">
                        Retry
                      </Button>
                    </p>
                  </div>
                ) : stats && (
                  <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 sm:mt-4">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span className="text-xs sm:text-sm font-medium" data-testid="text-projects-count">
                        {stats.projectsCount || 0} Projects
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span className="text-xs sm:text-sm font-medium" data-testid="text-quotes-count">
                        {stats.quotesCount || 0} Quotes
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0" />
                      <span className="text-xs sm:text-sm font-medium">
                        {stats.openingsCount || 0} Openings Surveyed
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid" data-testid="tabs-profile">
            <TabsTrigger value="profile" className="text-xs sm:text-sm" data-testid="tab-profile">
              <User className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm" data-testid="tab-security">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs sm:text-sm" data-testid="tab-preferences">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="organization" className="text-xs sm:text-sm" data-testid="tab-organization">
              <Building2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Organization</span>
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="text-xs sm:text-sm" data-testid="tab-infrastructure">
              <Server className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Infrastructure</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg">Personal Information</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Update your personal details and contact information
                      </CardDescription>
                    </div>
                  </div>
                  {!isEditing ? (
                    <Button 
                      size="sm"
                      onClick={() => {
                        setFormData({
                          firstName: user.firstName || "",
                          lastName: user.lastName || "",
                        });
                        setIsEditing(true);
                      }}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                      data-testid="button-edit-profile"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button 
                        size="sm"
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                        data-testid="button-cancel-edit"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSubmit}
                        disabled={updateProfileMutation.isPending}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? (
                          <>
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-4 sm:space-y-6">
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="firstName" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        value={isEditing ? formData.firstName : user.firstName || ""}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        disabled={!isEditing}
                        className="text-sm"
                        data-testid="input-first-name"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="lastName" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        value={isEditing ? formData.lastName : user.lastName || ""}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        disabled={!isEditing}
                        className="text-sm"
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ""}
                      disabled
                      className="text-sm"
                      data-testid="input-email"
                    />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Email cannot be changed. Contact{" "}
                      <a href={`mailto:${COMPANY_EMAILS.support}`} className="text-primary hover:underline">
                        {COMPANY_EMAILS.support}
                      </a>{" "}
                      if you need to update your email.
                    </p>
                  </div>
                </form>

                <Separator />

                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2">
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                    Account Settings
                  </h3>
                  <div className="flex items-center justify-between gap-2 py-2 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-medium">Theme Preference</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Choose your display theme</p>
                      </div>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="space-y-4 sm:space-y-6">
              <SessionManagement />
              
              <Card>
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg">Email Verification</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Verify your email address to secure your account
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <EmailVerificationStatus />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Notification Preferences</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Manage how and when you receive notifications
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-4 sm:space-y-6">
                {preferencesError ? (
                  <ErrorState
                    title="Failed to load preferences"
                    message={preferencesErrorObj instanceof Error ? preferencesErrorObj.message : "Unable to fetch notification preferences"}
                    error={preferencesErrorObj as Error}
                    onRetry={refetchPreferences}
                    testId="error-preferences"
                  />
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between gap-2 py-2 sm:py-3">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                        <div className="space-y-0.5 min-w-0">
                          <Label htmlFor="email-notifications" className="text-sm sm:text-base font-medium">
                            Email Notifications
                          </Label>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Receive email notifications for important updates
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={preferences?.emailNotifications || false}
                        onCheckedChange={() => togglePreference("emailNotifications")}
                        disabled={updatePreferencesMutation.isPending}
                        className="shrink-0"
                        data-testid="switch-email-notifications"
                      />
                    </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-2 py-2 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                      <div className="space-y-0.5 min-w-0">
                        <Label htmlFor="project-updates" className="text-sm sm:text-base font-medium">
                          Project Updates
                        </Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Get notified when projects are updated or completed
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="project-updates"
                      checked={preferences?.projectUpdates || false}
                      onCheckedChange={() => togglePreference("projectUpdates")}
                      disabled={updatePreferencesMutation.isPending}
                      className="shrink-0"
                      data-testid="switch-project-updates"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-2 py-2 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                      <div className="space-y-0.5 min-w-0">
                        <Label htmlFor="quote-alerts" className="text-sm sm:text-base font-medium">
                          Quote Alerts
                        </Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Receive alerts for new quotes and approvals
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="quote-alerts"
                      checked={preferences?.quoteAlerts || false}
                      onCheckedChange={() => togglePreference("quoteAlerts")}
                      disabled={updatePreferencesMutation.isPending}
                      className="shrink-0"
                      data-testid="switch-quote-alerts"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-2 py-2 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                      <div className="space-y-0.5 min-w-0">
                        <Label htmlFor="weekly-digest" className="text-sm sm:text-base font-medium">
                          Weekly Digest
                        </Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Get a weekly summary of your activity and updates
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="weekly-digest"
                      checked={preferences?.weeklyDigest || false}
                      onCheckedChange={() => togglePreference("weeklyDigest")}
                      disabled={updatePreferencesMutation.isPending}
                      className="shrink-0"
                      data-testid="switch-weekly-digest"
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-2 py-2 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                      <div className="space-y-0.5 min-w-0">
                        <Label htmlFor="marketing-emails" className="text-sm sm:text-base font-medium">
                          Marketing Communications
                        </Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Receive product updates, tips, and feature announcements
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="marketing-emails"
                      checked={preferences?.marketingEmails || false}
                      onCheckedChange={() => togglePreference("marketingEmails")}
                      disabled={updatePreferencesMutation.isPending}
                      className="shrink-0"
                      data-testid="switch-marketing-emails"
                    />
                  </div>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Language Preferences */}
            <Card className="mt-4 sm:mt-6">
              <CardHeader className="px-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <Languages className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Language</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Select your preferred language for the interface
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2 py-2 sm:py-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="space-y-0.5 min-w-0">
                      <Label htmlFor="language-select" className="text-sm sm:text-base font-medium">
                        Preferred Language
                      </Label>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Choose the language you want to use for the application interface
                      </p>
                    </div>
                  </div>
                  <Select
                    value={user?.language || "en"}
                    onValueChange={(value) => {
                      updateLanguageMutation.mutate(value);
                    }}
                    disabled={updateLanguageMutation.isPending}
                  >
                    <SelectTrigger 
                      id="language-select" 
                      className="w-full sm:w-[180px] shrink-0 text-sm"
                      data-testid="select-language"
                    >
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en" data-testid="option-english">
                        English
                      </SelectItem>
                      <SelectItem value="es" data-testid="option-spanish">
                        Español (Spanish)
                      </SelectItem>
                      <SelectItem value="fr" data-testid="option-french">
                        Français (French)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Measurement System Preferences */}
            <Card className="mt-4 sm:mt-6">
              <CardHeader className="px-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <CardTitle className="text-base sm:text-lg">Measurement System</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Choose your preferred unit system for measurements
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {scanConfigError ? (
                  <ErrorState
                    title="Failed to load measurement preferences"
                    message={scanConfigErrorObj instanceof Error ? scanConfigErrorObj.message : "Unable to fetch measurement system settings"}
                    error={scanConfigErrorObj as Error}
                    onRetry={refetchScanConfig}
                    testId="error-scan-config"
                  />
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2 py-2 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className="space-y-0.5 min-w-0">
                        <Label htmlFor="measurement-system" className="text-sm sm:text-base font-medium">
                          Preferred Unit System
                        </Label>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Select whether to display measurements in metric (mm, cm, m) or imperial (inches, feet) units
                        </p>
                      </div>
                    </div>
                    <Select
                      value={scanConfig?.measurementSystem || "imperial"}
                      onValueChange={(value: "metric" | "imperial") => {
                        updateScanConfigMutation.mutate({ measurementSystem: value });
                      }}
                      disabled={!scanConfig || scanConfigFetching || updateScanConfigMutation.isPending}
                    >
                      <SelectTrigger 
                        id="measurement-system" 
                        className="w-full sm:w-[180px] shrink-0 text-sm"
                        data-testid="select-measurement-system"
                      >
                        <SelectValue placeholder="Select system" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="imperial" data-testid="option-imperial">
                          Imperial (in, ft)
                        </SelectItem>
                        <SelectItem value="metric" data-testid="option-metric">
                          Metric (mm, cm, m)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization">
            {user.organization ? (
              <Card>
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg">Organization Details</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Your organization information and subscription status
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                        <Building2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        Organization Name
                      </Label>
                      <p className="text-sm sm:text-base font-medium" data-testid="text-org-name">
                        {user.organization.name}
                      </p>
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                        <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        Subscription Plan
                      </Label>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm sm:text-base font-medium capitalize" data-testid="text-subscription-tier">
                          {user.organization.subscriptionTier}
                        </p>
                        <Badge 
                          variant={user.organization.subscriptionStatus === "active" ? "default" : "secondary"}
                          className="shrink-0"
                          data-testid="badge-subscription-status"
                        >
                          {user.organization.subscriptionStatus === "active" && (
                            <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
                          )}
                          {user.organization.subscriptionStatus}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                        <Shield className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        Your Role
                      </Label>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="w-fit shrink-0">
                        <Shield className="h-3 w-3 mr-1 shrink-0" />
                        {user.role?.charAt(0).toUpperCase()}{user.role?.slice(1)}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                        <Hash className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                        Organization ID
                      </Label>
                      <p className="text-xs sm:text-sm font-mono text-muted-foreground truncate" data-testid="text-org-id">
                        {user.organization.id}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 sm:space-y-3">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      To manage team members, billing, or organization settings, visit the respective pages in the Settings menu.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button size="sm" variant="outline" asChild className="text-xs sm:text-sm" data-testid="button-view-team">
                        <a href="/team">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                          View Team
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild className="text-xs sm:text-sm" data-testid="button-view-billing">
                        <a href="/billing">
                          <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                          View Billing
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 sm:p-12 text-center">
                  <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold mb-2">No Organization</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    You are not currently associated with an organization.
                  </p>
                  <Button size="sm" className="text-xs sm:text-sm">
                    <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0" />
                    Create Organization
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Infrastructure Tab */}
          <TabsContent value="infrastructure">
            <div className="space-y-4 sm:space-y-6">
              {/* Overall Status */}
              <Card data-testid="card-overall-status">
                <CardHeader className="px-4 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Server className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      <span className="min-w-0">Overall Infrastructure Status</span>
                    </CardTitle>
                    <Badge
                      variant={health?.status === 'healthy' ? 'default' : 'destructive'}
                      className="shrink-0 w-fit"
                      data-testid={`badge-status-${health?.status}`}
                    >
                      {health?.status === 'healthy' ? (
                        <CheckCircle className="w-3 h-3 mr-1 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3 h-3 mr-1 shrink-0" />
                      )}
                      {health?.status || 'Unknown'}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    Real-time infrastructure health monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="flex items-center justify-between gap-2 p-3 sm:p-4 rounded-lg border min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Database className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-medium">Cache Backend</p>
                          <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                            {health?.cache?.backend}
                          </p>
                        </div>
                      </div>
                      <Badge variant={health?.cache?.healthy ? 'default' : 'destructive'} className="shrink-0">
                        {health?.cache?.healthy ? 'Healthy' : 'Degraded'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3 sm:p-4 rounded-lg border min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-medium">Job Queue Backend</p>
                          <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                            {health?.queue?.backend}
                          </p>
                        </div>
                      </div>
                      <Badge variant={health?.queue?.healthy ? 'default' : 'destructive'} className="shrink-0">
                        {health?.queue?.healthy ? 'Healthy' : 'Degraded'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                {/* Cache Statistics */}
                <Card data-testid="card-cache-stats">
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Database className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      Cache Statistics
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Distributed cache performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 space-y-3 sm:space-y-4">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Backend Type</span>
                        <Badge variant="outline" className="capitalize shrink-0">
                          {cacheStats?.backend}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Total Entries</span>
                        <span className="text-sm sm:text-base font-medium">{cacheStats?.totalEntries || 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Active Entries</span>
                        <span className="text-sm sm:text-base font-medium">{cacheStats?.activeEntries || 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Memory</span>
                        <span className="text-sm sm:text-base font-medium">{cacheStats?.memoryEstimate || '0 B'}</span>
                      </div>
                    </div>

                    {cacheStats?.backend === 'redis' && (
                      <div className="p-2 sm:p-3 bg-green-500/10 border border-green-500/20 rounded-lg mt-3 sm:mt-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-green-700 dark:text-green-400">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium">Redis Connected</span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                          Using distributed cache with SCAN-based invalidation
                        </p>
                      </div>
                    )}

                    {cacheStats?.backend === 'in-memory' && (
                      <div className="p-2 sm:p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mt-3 sm:mt-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-700 dark:text-yellow-400">
                          <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium">In-Memory Fallback Active</span>
                        </div>
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                          Redis unavailable, using local cache
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Job Queue Statistics */}
                <Card data-testid="card-queue-stats">
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      Job Queue Statistics
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Background job processing metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 space-y-3 sm:space-y-4">
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Backend Type</span>
                        <Badge variant="outline" className="capitalize shrink-0">
                          {queueStats?.backend}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Total Jobs</span>
                        <span className="text-sm sm:text-base font-medium">{queueStats?.totalJobs || 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Active Jobs</span>
                        <span className="text-sm sm:text-base font-medium">{queueStats?.totalActive || 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Waiting Jobs</span>
                        <span className="text-sm sm:text-base font-medium">{queueStats?.totalWaiting || 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Completed</span>
                        <span className="text-sm sm:text-base font-medium text-green-600">{queueStats?.totalCompleted || 0}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm text-muted-foreground">Failed</span>
                        <span className="text-sm sm:text-base font-medium text-red-600">{queueStats?.totalFailed || 0}</span>
                      </div>
                    </div>

                    {queueStats?.backend === 'bullmq' && (
                      <div className="p-2 sm:p-3 bg-green-500/10 border border-green-500/20 rounded-lg mt-3 sm:mt-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-green-700 dark:text-green-400">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium">BullMQ Connected</span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                          Using production job queue with health monitoring
                        </p>
                      </div>
                    )}

                    {queueStats?.backend === 'in-memory' && (
                      <div className="p-2 sm:p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mt-3 sm:mt-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-700 dark:text-yellow-400">
                          <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium">In-Memory Fallback Active</span>
                        </div>
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                          Redis unavailable, using local queue
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Application Metrics */}
              <Card data-testid="card-app-metrics">
                <CardHeader className="px-4 sm:px-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    Application Metrics
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Server performance and resource utilization
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm text-muted-foreground">Uptime</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {metrics?.application?.uptime?.formatted || '0h 0m'}
                      </p>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm text-muted-foreground">Memory Usage</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {metrics?.application?.memory?.usedMB || 0} MB
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {metrics?.application?.memory?.percentage || 0}% of {metrics?.application?.memory?.totalMB || 0} MB
                      </p>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm text-muted-foreground">Cache Entries</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {metrics?.cache?.entries || 0}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        Backend: {metrics?.cache?.backend || 'unknown'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
