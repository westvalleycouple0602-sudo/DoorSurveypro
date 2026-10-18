import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ErrorState } from "@/components/error-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  Database,
  Users,
  Building2,
  FileText,
  Settings,
  Zap,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Shield,
  ToggleLeft,
  ToggleRight,
  Eye,
  ChevronRight,
  Plus,
  Search,
  Pencil,
  UserCog,
  Contact,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface SystemHealth {
  database: { status: string; latency?: number; error?: string };
  redis: { status: string; latency?: number; error?: string };
  jobQueue: { status: string; pending?: number; active?: number; completed?: number; failed?: number; error?: string };
  server: { uptime: number; memory: NodeJS.MemoryUsage; nodeVersion: string };
}

interface SystemStats {
  totalUsers: number;
  totalOrganizations: number;
  totalProjects: number;
  totalCustomers: number;
  recentUsers: number;
  activeJobs: number;
  errorRate: number;
}

interface SystemUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  authProvider: string | null;
  createdAt: string;
  memberships: { organizationId: string; role: string }[];
}

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
  userCount: number;
  projectCount: number;
}

interface AdminCustomer {
  id: string;
  organizationId: string | null;
  name: string;
  type: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  createdAt: string;
  locationCount: number;
  organizationName: string | null;
}

interface AuditLog {
  id: string;
  organizationId: string;
  userId: string;
  method: string;
  path: string;
  status: number;
  ip: string | null;
  userAgent: string | null;
  responseTimeMs: number | null;
  createdAt: string;
}

interface FeatureFlags {
  aiAssistant: boolean;
  stripePayments: boolean;
  emailNotifications: boolean;
  hubspotIntegration: boolean;
  docusignIntegration: boolean;
  lidarScanning: boolean;
  arMeasurements: boolean;
  complianceValidation: boolean;
  masterKeySystem: boolean;
  bulkImport: boolean;
  webhooks: boolean;
  betaTesting: boolean;
}

interface SystemConfig {
  environment: string;
  databaseConfigured: boolean;
  redisConfigured: boolean;
  stripeConfigured: boolean;
  resendConfigured: boolean;
  openaiConfigured: boolean;
  hubspotConfigured: boolean;
  docusignConfigured: boolean;
  sentryConfigured: boolean;
  natsConfigured: boolean;
  googleCalendarConfigured: boolean;
  microsoftCalendarConfigured: boolean;
  customDomains: string[];
  sessionSecret: string;
}

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "pm_manager", label: "PM Manager" },
  { value: "manager", label: "Manager" },
  { value: "project_manager", label: "Project Manager" },
  { value: "engineer", label: "Engineer" },
  { value: "sales_rep", label: "Sales Rep" },
  { value: "procurement_officer", label: "Procurement Officer" },
  { value: "technician", label: "Technician" },
  { value: "viewer", label: "Viewer" },
];

const addCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  type: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  notes: z.string().optional(),
  organizationId: z.string().optional(),
});

type AddCustomerFormValues = z.infer<typeof addCustomerSchema>;

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "healthy") {
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Healthy</Badge>;
  }
  if (status === "unhealthy") {
    return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Unhealthy</Badge>;
  }
  if (status === "not_configured") {
    return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" />Not Configured</Badge>;
  }
  return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Unknown</Badge>;
}

export default function SystemAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("health");
  const [customerSearch, setCustomerSearch] = useState("");
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editRoleUserId, setEditRoleUserId] = useState<string | null>(null);
  const [editRoleValue, setEditRoleValue] = useState("");

  const { data: health, isLoading: healthLoading, isError: healthError, refetch: refetchHealth } = useQuery<SystemHealth>({
    queryKey: ["/api/system-admin/health"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ["/api/system-admin/stats"],
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: SystemUser[]; pagination: any }>({
    queryKey: ["/api/system-admin/users"],
  });

  const { data: orgsData, isLoading: orgsLoading } = useQuery<{ organizations: Organization[] }>({
    queryKey: ["/api/system-admin/organizations"],
  });

  const { data: customersData, isLoading: customersLoading } = useQuery<{ customers: AdminCustomer[]; pagination: any }>({
    queryKey: ["/api/system-admin/customers", { search: customerSearch }],
    queryFn: async () => {
      const params = customerSearch ? `?search=${encodeURIComponent(customerSearch)}` : "";
      const res = await fetch(`/api/system-admin/customers${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: logsData, isLoading: logsLoading } = useQuery<{ logs: AuditLog[]; pagination: any }>({
    queryKey: ["/api/system-admin/audit-logs"],
  });

  const { data: flagsData, isLoading: flagsLoading } = useQuery<{ flags: FeatureFlags }>({
    queryKey: ["/api/system-admin/feature-flags"],
  });

  const { data: configData, isLoading: configLoading } = useQuery<{ config: SystemConfig }>({
    queryKey: ["/api/system-admin/config"],
  });

  const clearCacheMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/system-admin/cache/clear"),
    onSuccess: () => {
      toast({ title: "Cache Cleared", description: "Redis cache has been cleared successfully." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const retryFailedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/system-admin/queue/retry-failed"),
    onSuccess: () => {
      toast({ title: "Jobs Retried", description: "Failed jobs have been queued for retry." });
      queryClient.invalidateQueries({ queryKey: ["/api/system-admin/health"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const clearCompletedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/system-admin/queue/clear-completed"),
    onSuccess: () => {
      toast({ title: "Completed Jobs Cleared", description: "Completed jobs have been removed from the queue." });
      queryClient.invalidateQueries({ queryKey: ["/api/system-admin/health"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: AddCustomerFormValues) => apiRequest("POST", "/api/system-admin/customers", data),
    onSuccess: () => {
      toast({ title: "Customer Created", description: "New customer has been added successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/system-admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-admin/stats"] });
      setAddCustomerOpen(false);
      addCustomerForm.reset();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (customerId: string) => apiRequest("DELETE", `/api/system-admin/customers/${customerId}`),
    onSuccess: () => {
      toast({ title: "Customer Deleted", description: "Customer has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/system-admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-admin/stats"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/system-admin/users/${userId}`),
    onSuccess: () => {
      toast({ title: "User Deleted", description: "User has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/system-admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-admin/stats"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiRequest("PATCH", `/api/system-admin/users/${userId}`, { role }),
    onSuccess: () => {
      toast({ title: "Role Updated", description: "User role has been changed." });
      queryClient.invalidateQueries({ queryKey: ["/api/system-admin/users"] });
      setEditRoleUserId(null);
      setEditRoleValue("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: (orgId: string) => apiRequest("DELETE", `/api/system-admin/organizations/${orgId}`),
    onSuccess: () => {
      toast({ title: "Organization Deleted", description: "Organization has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/system-admin/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-admin/stats"] });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const addCustomerForm = useForm<AddCustomerFormValues>({
    resolver: zodResolver(addCustomerSchema),
    defaultValues: {
      name: "",
      type: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      notes: "",
      organizationId: "",
    },
  });

  function onAddCustomerSubmit(data: AddCustomerFormValues) {
    const submitData = {
      ...data,
      organizationId: data.organizationId || undefined,
      type: data.type || undefined,
      contactName: data.contactName || undefined,
      contactEmail: data.contactEmail || undefined,
      contactPhone: data.contactPhone || undefined,
      notes: data.notes || undefined,
    };
    createCustomerMutation.mutate(submitData);
  }

  if (healthError) {
    return (
      <div className="container max-w-7xl mx-auto py-6 px-4">
        <ErrorState
          title="Unable to Load System Admin"
          message="You may not have permission to access this page or there was a server error."
          onRetry={() => refetchHealth()}
          testId="error-system-admin"
        />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-6 px-4" data-testid="page-system-admin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">System Administration</h1>
          <p className="text-muted-foreground">Monitor and manage platform infrastructure</p>
        </div>
        <Button variant="outline" onClick={() => refetchHealth()} data-testid="button-refresh">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card
            className="hover-elevate cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("users")}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab("users");
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold" data-testid="stat-total-users">{stats.totalUsers}</span>
              </div>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card
            className="hover-elevate cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => {
              // Scroll to organizations list if we had a tab for it, but for now just stay or go to users
              setActiveTab("users");
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab("users");
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold" data-testid="stat-total-orgs">{stats.totalOrganizations}</span>
              </div>
              <p className="text-sm text-muted-foreground">Organizations</p>
            </CardContent>
          </Card>
          <Card
            className="hover-elevate cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("customers")}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab("customers");
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Contact className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold" data-testid="stat-total-customers">{stats.totalCustomers}</span>
              </div>
              <p className="text-sm text-muted-foreground">Customers</p>
            </CardContent>
          </Card>
          <Card
            className="hover-elevate cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("logs")}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab("logs");
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold" data-testid="stat-total-projects">{stats.totalProjects}</span>
              </div>
              <p className="text-sm text-muted-foreground">Projects</p>
            </CardContent>
          </Card>
          <Card
            className="hover-elevate cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab("health")}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setActiveTab("health");
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold" data-testid="stat-recent-users">{stats.recentUsers}</span>
              </div>
              <p className="text-sm text-muted-foreground">New Users (7d)</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex w-full max-w-4xl overflow-x-auto">
          <TabsTrigger value="health" className="flex-1 min-w-0" data-testid="tab-health">
            <Server className="w-4 h-4 mr-2 hidden sm:inline" />
            Health
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1 min-w-0" data-testid="tab-users">
            <Users className="w-4 h-4 mr-2 hidden sm:inline" />
            Users
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex-1 min-w-0" data-testid="tab-customers">
            <Contact className="w-4 h-4 mr-2 hidden sm:inline" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex-1 min-w-0" data-testid="tab-logs">
            <FileText className="w-4 h-4 mr-2 hidden sm:inline" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="flags" className="flex-1 min-w-0" data-testid="tab-flags">
            <Zap className="w-4 h-4 mr-2 hidden sm:inline" />
            Features
          </TabsTrigger>
          <TabsTrigger value="config" className="flex-1 min-w-0" data-testid="tab-config">
            <Settings className="w-4 h-4 mr-2 hidden sm:inline" />
            Config
          </TabsTrigger>
          <TabsTrigger value="debug" className="flex-1 min-w-0" data-testid="tab-debug">
            <Shield className="w-4 h-4 mr-2 hidden sm:inline" />
            Debug
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          {healthLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : health && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card
                className="hover-elevate cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (health.database.error) {
                    toast({
                      title: "Database Error",
                      description: health.database.error,
                      variant: "destructive",
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    if (health.database.error) {
                      toast({
                        title: "Database Error",
                        description: health.database.error,
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Database
                  </CardTitle>
                  <StatusBadge status={health.database.status} />
                </CardHeader>
                <CardContent>
                  {health.database.latency && (
                    <p className="text-sm text-muted-foreground">Latency: {health.database.latency}ms</p>
                  )}
                  {health.database.error && (
                    <p className="text-sm text-destructive">{health.database.error}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    Redis Cache
                  </CardTitle>
                  <StatusBadge status={health.redis.status} />
                </CardHeader>
                <CardContent
                  className="hover-elevate cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (health.redis.error) {
                      toast({
                        title: "Redis Error",
                        description: health.redis.error,
                        variant: "destructive",
                      });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      if (health.redis.error) {
                        toast({
                          title: "Redis Error",
                          description: health.redis.error,
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                >
                  {health.redis.latency && (
                    <p className="text-sm text-muted-foreground">Latency: {health.redis.latency}ms</p>
                  )}
                  {health.redis.error && (
                    <p className="text-sm text-muted-foreground">{health.redis.error}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Job Queue
                  </CardTitle>
                  <StatusBadge status={health.jobQueue.status} />
                </CardHeader>
                <CardContent
                  className="space-y-2 hover-elevate cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (health.jobQueue.error) {
                      toast({
                        title: "Job Queue Error",
                        description: health.jobQueue.error,
                        variant: "destructive",
                      });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      if (health.jobQueue.error) {
                        toast({
                          title: "Job Queue Error",
                          description: health.jobQueue.error,
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                >
                  {health.jobQueue.pending !== undefined && (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Pending:</span>
                        <span className="ml-2 font-medium">{health.jobQueue.pending}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Active:</span>
                        <span className="ml-2 font-medium">{health.jobQueue.active}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="ml-2 font-medium text-green-600">{health.jobQueue.completed}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed:</span>
                        <span className="ml-2 font-medium text-red-600">{health.jobQueue.failed}</span>
                      </div>
                    </div>
                  )}
                  {health.jobQueue.error && (
                    <p className="text-sm text-muted-foreground">{health.jobQueue.error}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    Server
                  </CardTitle>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle className="w-3 h-3 mr-1" />Running
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Uptime:</span>
                      <span className="ml-2 font-medium">{formatUptime(health.server.uptime)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Node:</span>
                      <span className="ml-2 font-medium">{health.server.nodeVersion}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MemoryStick className="w-3 h-3" /> Heap Used
                      </span>
                      <span>{formatBytes(health.server.memory.heapUsed)}</span>
                    </div>
                    <Progress value={(health.server.memory.heapUsed / health.server.memory.heapTotal) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Platform-wide user management</CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : usersData?.users && (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Organizations</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData.users.map((u) => (
                        <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                          <TableCell className="font-medium">
                            {u.firstName} {u.lastName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{u.email || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{u.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{u.authProvider === "replit" ? "Migrated account" : u.authProvider || "Clerk"}</Badge>
                          </TableCell>
                          <TableCell>{u.memberships.length}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Dialog
                                open={editRoleUserId === u.id}
                                onOpenChange={(open) => {
                                  if (open) {
                                    setEditRoleUserId(u.id);
                                    setEditRoleValue(u.role);
                                  } else {
                                    setEditRoleUserId(null);
                                    setEditRoleValue("");
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    data-testid={`button-edit-user-${u.id}`}
                                    disabled={u.id === user?.id}
                                    aria-label="Edit user role"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent data-testid="dialog-edit-role">
                                  <DialogHeader>
                                    <DialogTitle>Edit User Role</DialogTitle>
                                    <DialogDescription>
                                      Change role for {u.firstName} {u.lastName} ({u.email})
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Role</Label>
                                      <Select value={editRoleValue} onValueChange={setEditRoleValue}>
                                        <SelectTrigger data-testid="select-role">
                                          <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {ROLE_OPTIONS.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setEditRoleUserId(null);
                                        setEditRoleValue("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        if (editRoleUserId && editRoleValue) {
                                          updateUserRoleMutation.mutate({ userId: editRoleUserId, role: editRoleValue });
                                        }
                                      }}
                                      disabled={updateUserRoleMutation.isPending || !editRoleValue}
                                      data-testid="button-save-role"
                                    >
                                      {updateUserRoleMutation.isPending ? "Saving..." : "Save"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    data-testid={`button-delete-user-${u.id}`}
                                    disabled={u.id === user?.id}
                                    aria-label="Delete user"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent data-testid="dialog-confirm-delete">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {u.firstName} {u.lastName} ({u.email})? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteUserMutation.mutate(u.id)}
                                      data-testid="button-confirm-delete"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>All registered organizations</CardDescription>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : orgsData?.organizations && (
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Projects</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgsData.organizations.map((org) => (
                        <TableRow key={org.id} data-testid={`row-org-${org.id}`}>
                          <TableCell className="font-medium">{org.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{org.subscriptionTier}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={org.subscriptionStatus === "active" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"}>
                              {org.subscriptionStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>{org.userCount}</TableCell>
                          <TableCell>{org.projectCount}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(org.createdAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  data-testid={`button-delete-org-${org.id}`}
                                  aria-label="Delete organization"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent data-testid="dialog-confirm-delete">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{org.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteOrgMutation.mutate(org.id)}
                                    data-testid="button-confirm-delete"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>Manage all customers across organizations</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 w-[200px]"
                    data-testid="input-search-customers"
                  />
                </div>
                <Dialog open={addCustomerOpen} onOpenChange={(open) => {
                  setAddCustomerOpen(open);
                  if (!open) addCustomerForm.reset();
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-customer">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Customer
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-add-customer" className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Customer</DialogTitle>
                      <DialogDescription>Create a new customer record.</DialogDescription>
                    </DialogHeader>
                    <Form {...addCustomerForm}>
                      <form onSubmit={addCustomerForm.handleSubmit(onAddCustomerSubmit)} className="space-y-4">
                        <FormField
                          control={addCustomerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Customer name" data-testid="input-customer-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addCustomerForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-customer-type">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="commercial">Commercial</SelectItem>
                                  <SelectItem value="residential">Residential</SelectItem>
                                  <SelectItem value="government">Government</SelectItem>
                                  <SelectItem value="education">Education</SelectItem>
                                  <SelectItem value="healthcare">Healthcare</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addCustomerForm.control}
                          name="contactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Contact person" data-testid="input-customer-contact" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addCustomerForm.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="contact@example.com" data-testid="input-customer-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addCustomerForm.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Phone number" data-testid="input-customer-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addCustomerForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Additional notes" data-testid="input-customer-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={addCustomerForm.control}
                          name="organizationId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organization</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-customer-org">
                                    <SelectValue placeholder="Select organization (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {orgsData?.organizations?.map((org) => (
                                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setAddCustomerOpen(false);
                              addCustomerForm.reset();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createCustomerMutation.isPending}
                            data-testid="button-submit-customer"
                          >
                            {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : customersData?.customers && (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Locations</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customersData.customers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No customers found
                          </TableCell>
                        </TableRow>
                      ) : (
                        customersData.customers.map((cust) => (
                          <TableRow key={cust.id} data-testid={`row-customer-${cust.id}`}>
                            <TableCell className="font-medium">{cust.name}</TableCell>
                            <TableCell>
                              {cust.type ? <Badge variant="outline">{cust.type}</Badge> : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{cust.contactName || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{cust.contactEmail || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{cust.organizationName || "—"}</TableCell>
                            <TableCell>{cust.locationCount}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {cust.createdAt ? format(new Date(cust.createdAt), "MMM d, yyyy") : "—"}
                            </TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    data-testid={`button-delete-customer-${cust.id}`}
                                    aria-label="Delete customer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent data-testid="dialog-confirm-delete">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{cust.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteCustomerMutation.mutate(cust.id)}
                                      data-testid="button-confirm-delete"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>System-wide activity tracking</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : logsData?.logs && (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsData.logs.map((log) => (
                        <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                          <TableCell className="text-muted-foreground text-xs">
                            {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              log.method === "GET" ? "border-blue-500/30 text-blue-600" :
                              log.method === "POST" ? "border-green-500/30 text-green-600" :
                              log.method === "PATCH" ? "border-yellow-500/30 text-yellow-600" :
                              "border-red-500/30 text-red-600"
                            }>
                              {log.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">{log.path}</TableCell>
                          <TableCell>
                            <Badge className={
                              log.status < 300 ? "bg-green-500/10 text-green-600" :
                              log.status < 400 ? "bg-blue-500/10 text-blue-600" :
                              log.status < 500 ? "bg-yellow-500/10 text-yellow-600" :
                              "bg-red-500/10 text-red-600"
                            }>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {log.responseTimeMs ? `${log.responseTimeMs}ms` : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{log.ip || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Platform feature availability status</CardDescription>
            </CardHeader>
            <CardContent>
              {flagsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : flagsData?.flags && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {Object.entries(flagsData.flags).map(([key, enabled]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg border"
                      data-testid={`flag-${key}`}
                    >
                      <div className="flex items-center gap-3">
                        {enabled ? (
                          <ToggleRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                        )}
                        <span className="font-medium capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </div>
                      <Badge className={enabled ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}>
                        {enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Environment and service configuration status</CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : configData?.config && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="font-medium">Environment</span>
                    <Badge variant="outline">{configData.config.environment}</Badge>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { key: "databaseConfigured", label: "Database" },
                      { key: "redisConfigured", label: "Redis" },
                      { key: "stripeConfigured", label: "Stripe" },
                      { key: "resendConfigured", label: "Resend Email" },
                      { key: "openaiConfigured", label: "OpenAI" },
                      { key: "hubspotConfigured", label: "HubSpot" },
                      { key: "docusignConfigured", label: "DocuSign" },
                      { key: "sentryConfigured", label: "Sentry" },
                      { key: "natsConfigured", label: "NATS" },
                      { key: "googleCalendarConfigured", label: "Google Calendar" },
                      { key: "microsoftCalendarConfigured", label: "Microsoft Calendar" },
                    ].map(({ key, label }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 rounded border"
                        data-testid={`config-${key}`}
                      >
                        <span className="text-sm">{label}</span>
                        {(configData.config as any)[key] ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>

                  {configData.config.customDomains.length > 0 && (
                    <div className="p-3 rounded-lg border">
                      <span className="font-medium block mb-2">Custom Domains</span>
                      <div className="flex flex-wrap gap-2">
                        {configData.config.customDomains.map((domain) => (
                          <Badge key={domain} variant="secondary">{domain}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  Cache Management
                </CardTitle>
                <CardDescription>Clear Redis cache to refresh cached data</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={() => clearCacheMutation.mutate()}
                  disabled={clearCacheMutation.isPending}
                  data-testid="button-clear-cache"
                >
                  {clearCacheMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Clear Cache
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Job Queue Management
                </CardTitle>
                <CardDescription>Manage background job queue</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => retryFailedMutation.mutate()}
                  disabled={retryFailedMutation.isPending}
                  data-testid="button-retry-failed"
                >
                  {retryFailedMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Retry Failed Jobs
                </Button>
                <Button
                  variant="outline"
                  onClick={() => clearCompletedMutation.mutate()}
                  disabled={clearCompletedMutation.isPending}
                  data-testid="button-clear-completed"
                >
                  {clearCompletedMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Clear Completed
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Quick Links
              </CardTitle>
              <CardDescription>Access development and monitoring tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                <a
                  href="/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                >
                  <span>Health Check</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
                <a
                  href="/api/graphql"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                >
                  <span>GraphQL Playground</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
                <a
                  href="/api/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                >
                  <span>API Documentation</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
