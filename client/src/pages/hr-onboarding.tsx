import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Users,
  UserPlus,
  ClipboardList,
  CheckCircle2,
  Clock,
  Calendar,
  Settings,
  Loader2,
  Building2,
  Link2,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Mail,
  Send,
  UserCheck as UserCheckIcon,
  RotateCcw,
  Ban,
  Briefcase,
  Download,
  BarChart3,
  TrendingUp,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type {
  HROnboardingPlan,
  HROnboardingStep,
  HREmployeeOnboarding,
  HROnboardingStepProgress,
  HRIntegrationCredential,
} from "@shared/schema";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "pm_manager", label: "PM Manager" },
  { value: "manager", label: "Manager" },
  { value: "project_manager", label: "Project Manager" },
  { value: "engineer", label: "Engineer" },
  { value: "sales_rep", label: "Sales Rep" },
  { value: "procurement_officer", label: "Procurement" },
  { value: "technician", label: "Technician" },
  { value: "viewer", label: "Viewer" },
];

const STEP_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "software", label: "Software Setup" },
  { value: "training", label: "Training" },
  { value: "compliance", label: "Compliance" },
  { value: "equipment", label: "Equipment" },
  { value: "hr_paperwork", label: "HR Paperwork" },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  software: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  training: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  compliance: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  equipment: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  hr_paperwork: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const HR_PROVIDERS = [
  { id: "bamboohr", name: "BambooHR", icon: Users, color: "bg-green-500" },
  { id: "workday", name: "Workday", icon: Briefcase, color: "bg-blue-600" },
  { id: "adp", name: "ADP", icon: Building2, color: "bg-red-600" },
  { id: "gusto", name: "Gusto", icon: Users, color: "bg-orange-500" },
  { id: "paylocity", name: "SAP SuccessFactors", icon: Building2, color: "bg-blue-800" },
  { id: "rippling", name: "Oracle HCM", icon: Building2, color: "bg-red-700" },
];

const STATUS_BADGES: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; className: string }> = {
  not_started: { variant: "secondary", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
  in_progress: { variant: "default", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  completed: { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  paused: { variant: "secondary", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  cancelled: { variant: "destructive", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  pending: { variant: "secondary", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
  skipped: { variant: "outline", className: "bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400" },
  blocked: { variant: "destructive", className: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" },
};

const IMPORT_STATUS_BADGES: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
  pending: { variant: "secondary", label: "Pending" },
  processing: { variant: "default", label: "Processing" },
  completed: { variant: "default", label: "Completed" },
  failed: { variant: "destructive", label: "Failed" },
  cancelled: { variant: "outline", label: "Cancelled" },
};

const planFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  targetRoles: z.array(z.string()).default([]),
  estimatedDurationDays: z.coerce.number().min(1).max(365).default(30),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

const stepFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  instructions: z.string().optional(),
  category: z.enum(["general", "software", "training", "compliance", "equipment", "hr_paperwork"]).default("general"),
  isRequired: z.boolean().default(true),
  dueDaysAfterStart: z.coerce.number().min(0).max(365).optional(),
  estimatedMinutes: z.coerce.number().min(0).max(480).optional(),
  isSelfAssigned: z.boolean().default(false),
});

const integrationFormSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  displayName: z.string().optional(),
  apiKey: z.string().optional(),
  subdomain: z.string().optional(),
  companyId: z.string().optional(),
  syncFrequency: z.enum(["realtime", "hourly", "daily", "weekly", "manual"]).default("daily"),
  syncEnabled: z.boolean().default(true),
});

type PlanFormData = z.infer<typeof planFormSchema>;
type StepFormData = z.infer<typeof stepFormSchema>;
type IntegrationFormData = z.infer<typeof integrationFormSchema>;

interface PlanWithSteps extends HROnboardingPlan {
  steps?: HROnboardingStep[];
}

interface EmployeeOnboardingWithDetails extends HREmployeeOnboarding {
  employee?: { firstName: string; lastName: string; email: string };
  plan?: HROnboardingPlan;
  stepProgress?: (HROnboardingStepProgress & { step: HROnboardingStep })[];
}

interface ImportJob {
  id: string;
  source: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  successfulImports: number;
  failedImports: number;
  skippedDuplicates: number;
  errors: { row?: number; field?: string; message: string }[];
  sourceFileName?: string;
  createdAt: string;
  completedAt?: string;
}

interface EmployeeInvite {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  primaryRole: string;
  additionalRoles: string[];
  department?: string;
  status: string;
  lastEmailSentAt?: string;
  emailSendCount: number;
  accountCreatedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
}

interface InviteWithDetails {
  invite: EmployeeInvite;
  invitedBy?: { id: string; firstName?: string; lastName?: string; email?: string };
  jobTitle?: { id: string; title: string };
  plan?: { id: string; name: string };
}

interface InviteStats {
  total: number;
  active: number;
  pending: number;
  setupInProgress: number;
  expired: number;
  cancelled: number;
  activationRate: number;
  byStatus: Record<string, number>;
}

interface HRAnalytics {
  roleDistribution: Array<{ role: string; count: number }>;
  departmentBreakdown: Array<{ department: string; count: number }>;
  inviteTrends: Array<{ date: string; invites: number }>;
  activationTrends: Array<{ date: string; activations: number }>;
  avgActivationTimeHours: number | null;
  funnel: Array<{ stage: string; count: number; percentage: number }>;
  recentActivity: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    primaryRole: string;
    department?: string;
    updatedAt: string;
  }>;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const VALID_ROLES = ["owner", "admin", "pm_manager", "manager", "project_manager", "engineer", "sales_rep", "procurement_officer", "technician", "viewer"] as const;

const inviteFormSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  primaryRole: z.enum(VALID_ROLES).default("technician"),
  additionalRoles: z.array(z.enum(VALID_ROLES)).default([]),
  department: z.string().optional(),
  onboardingPlanId: z.string().optional(),
  reportsToUserId: z.string().optional(),
  inviteMessage: z.string().optional(),
  sendEmail: z.boolean().default(true),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

const INVITE_STATUS_BADGES: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; className: string; label: string }> = {
  pending: { variant: "secondary", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", label: "Draft" },
  invited: { variant: "default", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "Invited" },
  link_clicked: { variant: "default", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", label: "Link Clicked" },
  setup_started: { variant: "default", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", label: "Setup Started" },
  active: { variant: "default", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "Active" },
  expired: { variant: "destructive", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", label: "Expired" },
  cancelled: { variant: "outline", className: "bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400", label: "Cancelled" },
};

export default function HROnboarding() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("invites");
  
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanWithSteps | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  
  const [showStepDialog, setShowStepDialog] = useState(false);
  const [editingStep, setEditingStep] = useState<HROnboardingStep | null>(null);
  const [currentPlanIdForStep, setCurrentPlanIdForStep] = useState<string | null>(null);
  
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<HRIntegrationCredential | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedImportJob, setSelectedImportJob] = useState<ImportJob | null>(null);
  
  const [showDeletePlanDialog, setShowDeletePlanDialog] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<PlanWithSteps | null>(null);
  const [showDeleteStepDialog, setShowDeleteStepDialog] = useState(false);
  const [deletingStep, setDeletingStep] = useState<HROnboardingStep | null>(null);
  
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteFilter, setInviteFilter] = useState<string>("all");
  
  // Per-row pending state for resend/cancel actions
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);

  const { data: plans = [], isLoading: plansLoading, isError: plansError, error: plansErrorObj, refetch: refetchPlans } = useQuery<PlanWithSteps[]>({
    queryKey: ["/api/hr-onboarding/plans"],
  });

  const { data: employees = [], isLoading: employeesLoading, isError: employeesError, error: employeesErrorObj, refetch: refetchEmployees } = useQuery<EmployeeOnboardingWithDetails[]>({
    queryKey: ["/api/hr-onboarding/employees"],
  });

  const { data: integrations = [], isLoading: integrationsLoading, isError: integrationsError, error: integrationsErrorObj, refetch: refetchIntegrations } = useQuery<HRIntegrationCredential[]>({
    queryKey: ["/api/hr-onboarding/integrations"],
  });

  const { data: importJobs = [], isLoading: importsLoading, isError: importsError, error: importsErrorObj, refetch: refetchImports } = useQuery<ImportJob[]>({
    queryKey: ["/api/hr-onboarding/imports"],
  });

  const { data: invites = [], isLoading: invitesLoading, refetch: refetchInvites } = useQuery<InviteWithDetails[]>({
    queryKey: ["/api/hr-onboarding/invites"],
  });

  const { data: inviteStats } = useQuery<InviteStats>({
    queryKey: ["/api/hr-onboarding/invites/stats"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<HRAnalytics>({
    queryKey: ["/api/hr-onboarding/analytics"],
  });

  const planForm = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      description: "",
      targetRoles: [],
      estimatedDurationDays: 30,
      isDefault: false,
      isActive: true,
    },
  });

  const stepForm = useForm<StepFormData>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: {
      title: "",
      description: "",
      instructions: "",
      category: "general",
      isRequired: true,
      dueDaysAfterStart: undefined,
      estimatedMinutes: undefined,
      isSelfAssigned: false,
    },
  });

  const integrationForm = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationFormSchema),
    defaultValues: {
      provider: "",
      displayName: "",
      apiKey: "",
      subdomain: "",
      companyId: "",
      syncFrequency: "daily",
      syncEnabled: true,
    },
  });

  const inviteForm = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      primaryRole: "technician",
      additionalRoles: [],
      department: "",
      onboardingPlanId: "",
      inviteMessage: "",
      sendEmail: true,
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const res = await apiRequest("POST", "/api/hr-onboarding/invites", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/invites/stats"] });
      setShowInviteDialog(false);
      inviteForm.reset();
      toast({ title: "Success", description: "Invitation sent successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      setResendingInviteId(id);
      const res = await apiRequest("POST", `/api/hr-onboarding/invites/${id}/resend`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/invites"] });
      toast({ title: "Success", description: "Invitation email resent" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      setResendingInviteId(null);
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      setCancellingInviteId(id);
      const res = await apiRequest("POST", `/api/hr-onboarding/invites/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/invites/stats"] });
      toast({ title: "Success", description: "Invitation cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      setCancellingInviteId(null);
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const res = await apiRequest("POST", "/api/hr-onboarding/plans", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/plans"] });
      setShowPlanDialog(false);
      planForm.reset();
      toast({ title: "Success", description: "Onboarding plan created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PlanFormData }) => {
      const res = await apiRequest("PUT", `/api/hr-onboarding/plans/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/plans"] });
      setShowPlanDialog(false);
      setEditingPlan(null);
      planForm.reset();
      toast({ title: "Success", description: "Onboarding plan updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/hr-onboarding/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/plans"] });
      setShowDeletePlanDialog(false);
      setDeletingPlan(null);
      toast({ title: "Success", description: "Onboarding plan deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createStepMutation = useMutation({
    mutationFn: async ({ planId, data }: { planId: string; data: StepFormData & { stepOrder: number } }) => {
      const res = await apiRequest("POST", `/api/hr-onboarding/plans/${planId}/steps`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/plans"] });
      setShowStepDialog(false);
      setCurrentPlanIdForStep(null);
      stepForm.reset();
      toast({ title: "Success", description: "Step added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ planId, stepId, data }: { planId: string; stepId: string; data: StepFormData }) => {
      const res = await apiRequest("PUT", `/api/hr-onboarding/plans/${planId}/steps/${stepId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/plans"] });
      setShowStepDialog(false);
      setEditingStep(null);
      setCurrentPlanIdForStep(null);
      stepForm.reset();
      toast({ title: "Success", description: "Step updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async ({ planId, stepId }: { planId: string; stepId: string }) => {
      await apiRequest("DELETE", `/api/hr-onboarding/plans/${planId}/steps/${stepId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/plans"] });
      setShowDeleteStepDialog(false);
      setDeletingStep(null);
      toast({ title: "Success", description: "Step deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reorderStepsMutation = useMutation({
    mutationFn: async ({ planId, stepIds }: { planId: string; stepIds: string[] }) => {
      const res = await apiRequest("PUT", `/api/hr-onboarding/plans/${planId}/steps/reorder`, { stepIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/plans"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/hr-onboarding/progress/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/employees"] });
      toast({ title: "Success", description: "Step status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async (data: IntegrationFormData) => {
      const res = await apiRequest("POST", "/api/hr-onboarding/integrations", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/integrations"] });
      setShowIntegrationDialog(false);
      setSelectedProvider(null);
      integrationForm.reset();
      toast({ title: "Success", description: "Integration connected successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateIntegrationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IntegrationFormData }) => {
      const res = await apiRequest("PUT", `/api/hr-onboarding/integrations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/integrations"] });
      setShowIntegrationDialog(false);
      setEditingIntegration(null);
      integrationForm.reset();
      toast({ title: "Success", description: "Integration updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const syncIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/hr-onboarding/integrations/${id}/sync`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/integrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/imports"] });
      toast({ title: "Success", description: "Sync initiated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const disconnectIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/hr-onboarding/integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/integrations"] });
      toast({ title: "Success", description: "Integration disconnected" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const [csvImportResults, setCsvImportResults] = useState<{
    fileName: string;
    totalRecords: number;
    successCount: number;
    errorCount: number;
    results: Array<{ row: number; email: string; status: "success" | "error"; message: string }>;
  } | null>(null);

  const uploadCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/hr-onboarding/imports/csv", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/imports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hr-onboarding/invites/stats"] });
      setCsvImportResults(data);
      if (data.errorCount === 0) {
        toast({ title: "Import Complete", description: `Successfully imported ${data.successCount} employees` });
      } else if (data.successCount > 0) {
        toast({ 
          title: "Import Partial", 
          description: `${data.successCount} imported, ${data.errorCount} failed`,
          variant: "default",
        });
      } else {
        toast({ title: "Import Failed", description: "No employees were imported", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const downloadCsvTemplate = () => {
    const headers = ["firstName", "lastName", "email", "role", "department", "message"];
    const sampleRows = [
      ["John", "Doe", "john.doe@example.com", "surveyor", "Field Operations", "Welcome to the team!"],
      ["Jane", "Smith", "jane.smith@example.com", "estimator", "Estimating", "Looking forward to working with you!"],
      ["Bob", "Johnson", "bob.johnson@example.com", "project_manager", "Projects", ""],
    ];
    const csvContent = [headers.join(","), ...sampleRows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_invite_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenPlanDialog = (plan?: PlanWithSteps) => {
    if (plan) {
      setEditingPlan(plan);
      planForm.reset({
        name: plan.name,
        description: plan.description || "",
        targetRoles: plan.targetRoles || [],
        estimatedDurationDays: plan.estimatedDurationDays,
        isDefault: plan.isDefault,
        isActive: plan.isActive,
      });
    } else {
      setEditingPlan(null);
      planForm.reset();
    }
    setShowPlanDialog(true);
  };

  const handlePlanSubmit = (data: PlanFormData) => {
    if (editingPlan) {
      updatePlanMutation.mutate({ id: editingPlan.id, data });
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const handleOpenStepDialog = (planId: string, step?: HROnboardingStep) => {
    setCurrentPlanIdForStep(planId);
    if (step) {
      setEditingStep(step);
      stepForm.reset({
        title: step.title,
        description: step.description || "",
        instructions: step.instructions || "",
        category: step.category as any,
        isRequired: step.isRequired,
        dueDaysAfterStart: step.dueDaysAfterStart || undefined,
        estimatedMinutes: step.estimatedMinutes || undefined,
        isSelfAssigned: step.isSelfAssigned,
      });
    } else {
      setEditingStep(null);
      stepForm.reset();
    }
    setShowStepDialog(true);
  };

  const handleStepSubmit = (data: StepFormData) => {
    if (!currentPlanIdForStep) return;
    
    if (editingStep) {
      updateStepMutation.mutate({ planId: currentPlanIdForStep, stepId: editingStep.id, data });
    } else {
      const plan = plans.find(p => p.id === currentPlanIdForStep);
      const stepOrder = (plan?.steps?.length || 0);
      createStepMutation.mutate({ planId: currentPlanIdForStep, data: { ...data, stepOrder } });
    }
  };

  const handleMoveStep = (planId: string, steps: HROnboardingStep[], stepId: string, direction: "up" | "down") => {
    const currentIndex = steps.findIndex(s => s.id === stepId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    
    const newSteps = [...steps];
    [newSteps[currentIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[currentIndex]];
    
    reorderStepsMutation.mutate({ planId, stepIds: newSteps.map(s => s.id) });
  };

  const handleOpenIntegrationDialog = (provider?: string, integration?: HRIntegrationCredential) => {
    if (integration) {
      setEditingIntegration(integration);
      setSelectedProvider(integration.provider);
      integrationForm.reset({
        provider: integration.provider,
        displayName: integration.displayName || "",
        apiKey: "",
        subdomain: integration.subdomain || "",
        companyId: integration.companyId || "",
        syncFrequency: integration.syncFrequency as any,
        syncEnabled: integration.syncEnabled,
      });
    } else if (provider) {
      setSelectedProvider(provider);
      setEditingIntegration(null);
      integrationForm.reset({ provider });
    }
    setShowIntegrationDialog(true);
  };

  const handleIntegrationSubmit = (data: IntegrationFormData) => {
    if (editingIntegration) {
      updateIntegrationMutation.mutate({ id: editingIntegration.id, data });
    } else {
      createIntegrationMutation.mutate(data);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadCsvMutation.mutate(file);
    }
  };

  const getProgressPercent = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const renderOnboardingPlansTab = () => {
    if (plansLoading) {
      return (
        <div className="flex items-center justify-center py-12" data-testid="loading-plans">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    if (plansError) {
      return (
        <ErrorState
          title="Failed to load onboarding plans"
          message={plansErrorObj instanceof Error ? plansErrorObj.message : "Unable to fetch plans"}
          error={plansErrorObj as Error}
          onRetry={refetchPlans}
          testId="error-plans"
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold" data-testid="text-plans-title">Onboarding Plan Templates</h3>
            <p className="text-sm text-muted-foreground">Create and manage onboarding plans for new employees</p>
          </div>
          <Button onClick={() => handleOpenPlanDialog()} data-testid="button-create-plan">
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>

        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No onboarding plans yet</h3>
              <p className="text-muted-foreground mb-4">Create your first onboarding plan to get started</p>
              <Button onClick={() => handleOpenPlanDialog()} data-testid="button-create-first-plan">
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <Card key={plan.id} data-testid={`card-plan-${plan.id}`}>
                <Collapsible
                  open={expandedPlanId === plan.id}
                  onOpenChange={(open) => setExpandedPlanId(open ? plan.id : null)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <CollapsibleTrigger asChild>
                        <button className="flex items-start gap-3 text-left hover-elevate p-2 -m-2 rounded-md flex-1">
                          <div className="mt-1">
                            {expandedPlanId === plan.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronUp className="h-4 w-4 rotate-180" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-base" data-testid={`text-plan-name-${plan.id}`}>{plan.name}</CardTitle>
                              {plan.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                              {!plan.isActive && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                            </div>
                            <CardDescription className="mt-1" data-testid={`text-plan-description-${plan.id}`}>
                              {plan.description || "No description"}
                            </CardDescription>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {plan.estimatedDurationDays} days
                              </span>
                              <span className="flex items-center gap-1">
                                <ClipboardList className="h-3.5 w-3.5" />
                                {plan.steps?.length || 0} steps
                              </span>
                              {plan.targetRoles && plan.targetRoles.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3.5 w-3.5" />
                                  {plan.targetRoles.length} roles
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenPlanDialog(plan)}
                          aria-label="Edit onboarding plan"
                          data-testid={`button-edit-plan-${plan.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingPlan(plan);
                            setShowDeletePlanDialog(true);
                          }}
                          aria-label="Delete onboarding plan"
                          data-testid={`button-delete-plan-${plan.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Steps</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenStepDialog(plan.id)}
                            data-testid={`button-add-step-${plan.id}`}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Step
                          </Button>
                        </div>
                        {(!plan.steps || plan.steps.length === 0) ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No steps defined yet. Add steps to build your onboarding workflow.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {plan.steps.map((step, index) => (
                              <div
                                key={step.id}
                                className="flex items-center gap-3 p-3 rounded-md border bg-muted/30"
                                data-testid={`step-${step.id}`}
                              >
                                <div className="flex flex-col gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    disabled={index === 0 || reorderStepsMutation.isPending}
                                    onClick={() => handleMoveStep(plan.id, plan.steps!, step.id, "up")}
                                    aria-label="Move step up"
                                    data-testid={`button-move-up-${step.id}`}
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    disabled={index === plan.steps!.length - 1 || reorderStepsMutation.isPending}
                                    onClick={() => handleMoveStep(plan.id, plan.steps!, step.id, "down")}
                                    aria-label="Move step down"
                                    data-testid={`button-move-down-${step.id}`}
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm" data-testid={`text-step-title-${step.id}`}>
                                      {step.title}
                                    </span>
                                    <Badge className={`text-xs ${CATEGORY_COLORS[step.category] || ""}`}>
                                      {STEP_CATEGORIES.find(c => c.value === step.category)?.label || step.category}
                                    </Badge>
                                    {step.isRequired && (
                                      <Badge variant="outline" className="text-xs">Required</Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {step.description || "No description"}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    {step.dueDaysAfterStart && (
                                      <span>Due: Day {step.dueDaysAfterStart}</span>
                                    )}
                                    {step.estimatedMinutes && (
                                      <span>{step.estimatedMinutes} min</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleOpenStepDialog(plan.id, step)}
                                    aria-label="Edit step"
                                    data-testid={`button-edit-step-${step.id}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setDeletingStep(step);
                                      setCurrentPlanIdForStep(plan.id);
                                      setShowDeleteStepDialog(true);
                                    }}
                                    aria-label="Delete step"
                                    data-testid={`button-delete-step-${step.id}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderActiveOnboardingTab = () => {
    if (employeesLoading) {
      return (
        <div className="flex items-center justify-center py-12" data-testid="loading-employees">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    if (employeesError) {
      return (
        <ErrorState
          title="Failed to load employee onboarding"
          message={employeesErrorObj instanceof Error ? employeesErrorObj.message : "Unable to fetch employees"}
          error={employeesErrorObj as Error}
          onRetry={refetchEmployees}
          testId="error-employees"
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold" data-testid="text-active-title">Active Onboarding</h3>
            <p className="text-sm text-muted-foreground">Track employee onboarding progress</p>
          </div>
        </div>

        {employees.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No employees being onboarded</h3>
              <p className="text-muted-foreground">Import employees or add them manually to start onboarding</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Target Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <>
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setExpandedEmployeeId(expandedEmployeeId === emp.id ? null : emp.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpandedEmployeeId(expandedEmployeeId === emp.id ? null : emp.id); }}
                      tabIndex={0}
                      data-testid={`row-employee-${emp.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {expandedEmployeeId === emp.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4 rotate-180" />
                          )}
                          <div>
                            <div className="font-medium" data-testid={`text-employee-name-${emp.id}`}>
                              {emp.employee ? `${emp.employee.firstName} ${emp.employee.lastName}` : "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {emp.employee?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-employee-plan-${emp.id}`}>
                        {emp.plan?.name || "Unknown Plan"}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGES[emp.status]?.className || ""} data-testid={`badge-employee-status-${emp.id}`}>
                          {emp.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress
                            value={getProgressPercent(emp.completedSteps, emp.totalSteps)}
                            className="h-2 flex-1"
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {emp.completedSteps}/{emp.totalSteps}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-employee-start-${emp.id}`}>
                        {emp.startDate ? format(new Date(emp.startDate), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell data-testid={`text-employee-target-${emp.id}`}>
                        {emp.targetCompletionDate ? format(new Date(emp.targetCompletionDate), "MMM d, yyyy") : "-"}
                      </TableCell>
                    </TableRow>
                    {expandedEmployeeId === emp.id && emp.stepProgress && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30">
                          <div className="py-2 space-y-2">
                            <h4 className="font-medium text-sm mb-3">Step Progress</h4>
                            {emp.stepProgress.map((progress) => (
                              <div
                                key={progress.id}
                                className="flex items-center justify-between p-3 rounded-md border bg-background"
                                data-testid={`progress-step-${progress.id}`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{progress.step.title}</span>
                                    <Badge className={STATUS_BADGES[progress.status]?.className || ""}>
                                      {progress.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                    {progress.dueDate && (
                                      <span>Due: {format(new Date(progress.dueDate), "MMM d, yyyy")}</span>
                                    )}
                                    {progress.completionNotes && (
                                      <span className="truncate max-w-xs">Note: {progress.completionNotes}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {progress.status === "pending" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateProgressMutation.mutate({ id: progress.id, status: "in_progress" });
                                      }}
                                      disabled={updateProgressMutation.isPending}
                                      data-testid={`button-start-step-${progress.id}`}
                                    >
                                      <PlayCircle className="h-3.5 w-3.5 mr-1" />
                                      Start
                                    </Button>
                                  )}
                                  {progress.status === "in_progress" && (
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateProgressMutation.mutate({ id: progress.id, status: "completed" });
                                      }}
                                      disabled={updateProgressMutation.isPending}
                                      data-testid={`button-complete-step-${progress.id}`}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                      Complete
                                    </Button>
                                  )}
                                  {(progress.status === "pending" || progress.status === "in_progress") && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateProgressMutation.mutate({ id: progress.id, status: "skipped" });
                                      }}
                                      disabled={updateProgressMutation.isPending}
                                      data-testid={`button-skip-step-${progress.id}`}
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-1" />
                                      Skip
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    );
  };

  const renderIntegrationsTab = () => {
    if (integrationsLoading) {
      return (
        <div className="flex items-center justify-center py-12" data-testid="loading-integrations">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    if (integrationsError) {
      return (
        <ErrorState
          title="Failed to load integrations"
          message={integrationsErrorObj instanceof Error ? integrationsErrorObj.message : "Unable to fetch integrations"}
          error={integrationsErrorObj as Error}
          onRetry={refetchIntegrations}
          testId="error-integrations"
        />
      );
    }

    const connectedProviders = new Set(integrations.map(i => i.provider));

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold" data-testid="text-integrations-title">HR System Integrations</h3>
          <p className="text-sm text-muted-foreground">Connect to your HR software to sync employee data</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {HR_PROVIDERS.map((provider) => {
            const integration = integrations.find(i => i.provider === provider.id);
            const isConnected = integration?.connectionStatus === "connected";
            const Icon = provider.icon;

            return (
              <Card key={provider.id} data-testid={`card-provider-${provider.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${provider.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {isConnected ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not connected</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {integration && isConnected ? (
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        {integration.lastSyncAt && (
                          <span>Last sync: {format(new Date(integration.lastSyncAt), "MMM d, h:mm a")}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Auto-sync</span>
                        <Badge variant={integration.syncEnabled ? "default" : "secondary"} className="text-xs">
                          {integration.syncFrequency}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncIntegrationMutation.mutate(integration.id)}
                          disabled={syncIntegrationMutation.isPending}
                          data-testid={`button-sync-${provider.id}`}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncIntegrationMutation.isPending ? "animate-spin" : ""}`} />
                          Sync Now
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenIntegrationDialog(provider.id, integration)}
                          data-testid={`button-edit-integration-${provider.id}`}
                        >
                          <Settings className="h-3.5 w-3.5 mr-1" />
                          Settings
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => disconnectIntegrationMutation.mutate(integration.id)}
                          disabled={disconnectIntegrationMutation.isPending}
                          data-testid={`button-disconnect-${provider.id}`}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleOpenIntegrationDialog(provider.id)}
                      data-testid={`button-connect-${provider.id}`}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderImportHistoryTab = () => {
    if (importsLoading) {
      return (
        <div className="flex items-center justify-center py-12" data-testid="loading-imports">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    if (importsError) {
      return (
        <ErrorState
          title="Failed to load import history"
          message={importsErrorObj instanceof Error ? importsErrorObj.message : "Unable to fetch imports"}
          error={importsErrorObj as Error}
          onRetry={refetchImports}
          testId="error-imports"
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold" data-testid="text-imports-title">Import History</h3>
            <p className="text-sm text-muted-foreground">View history of employee data imports</p>
          </div>
          <Button onClick={() => setShowImportDialog(true)} data-testid="button-import-csv">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>

        {importJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No imports yet</h3>
              <p className="text-muted-foreground mb-4">Import employees from a CSV file or sync from HR systems</p>
              <Button onClick={() => setShowImportDialog(true)} data-testid="button-first-import">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Success</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importJobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedImportJob(job)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedImportJob(job); }}
                    tabIndex={0}
                    data-testid={`row-import-${job.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {job.source === "csv_upload" ? (
                          <FileSpreadsheet className="h-4 w-4" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <div>
                          <div className="font-medium text-sm">
                            {job.source === "csv_upload" ? "CSV Upload" : "HR Sync"}
                          </div>
                          {job.sourceFileName && (
                            <div className="text-xs text-muted-foreground">{job.sourceFileName}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={IMPORT_STATUS_BADGES[job.status]?.variant || "secondary"}>
                        {IMPORT_STATUS_BADGES[job.status]?.label || job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.totalRecords}</TableCell>
                    <TableCell className="text-green-600 dark:text-green-400">{job.successfulImports}</TableCell>
                    <TableCell className="text-red-600 dark:text-red-400">{job.failedImports}</TableCell>
                    <TableCell>{format(new Date(job.createdAt), "MMM d, yyyy h:mm a")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    if (analyticsLoading) {
      return (
        <div className="flex items-center justify-center py-12" data-testid="loading-analytics">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    const formatRoleLabel = (role: string) => {
      return role
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold" data-testid="text-analytics-title">HR Analytics Dashboard</h3>
            <p className="text-sm text-muted-foreground">Insights into employee onboarding and activation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-invites">{inviteStats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total Invites</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <UserCheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold" data-testid="text-active-count">{inviteStats?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Active Accounts</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold" data-testid="text-activation-rate">{inviteStats?.activationRate || 0}%</p>
            <p className="text-xs text-muted-foreground">Activation Rate</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-bold" data-testid="text-avg-activation-time">
              {analytics?.avgActivationTimeHours !== null ? `${analytics?.avgActivationTimeHours}h` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">Avg. Activation Time</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="card-activation-funnel">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Activation Funnel</CardTitle>
              </div>
              <CardDescription>Conversion through onboarding stages</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.funnel && analytics.funnel.length > 0 ? (
                <div className="space-y-3">
                  {analytics.funnel.map((stage, index) => (
                    <div key={stage.stage} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.stage}</span>
                        <span className="text-muted-foreground">{stage.count} ({stage.percentage}%)</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${stage.percentage}%`,
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No funnel data available</p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-role-distribution">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Role Distribution</CardTitle>
              </div>
              <CardDescription>Employees by assigned role</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.roleDistribution && analytics.roleDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.roleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ role, percent }) => `${formatRoleLabel(role)}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="role"
                    >
                      {analytics.roleDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, formatRoleLabel(name as string)]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No role data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="card-invite-trends">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Invite Activity</CardTitle>
              </div>
              <CardDescription>Invites sent in the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.inviteTrends && analytics.inviteTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={analytics.inviteTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    />
                    <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Area type="monotone" dataKey="invites" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No trend data available</p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-department-breakdown">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Department Breakdown</CardTitle>
              </div>
              <CardDescription>Employees by department</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.departmentBreakdown && analytics.departmentBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.departmentBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" tick={{ fontSize: 10 }} />
                    <YAxis 
                      dataKey="department" 
                      type="category" 
                      width={100} 
                      className="text-xs" 
                      tick={{ fontSize: 10 }} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No department data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-recent-activity">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </div>
            <CardDescription>Latest updates to employee invites</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.recentActivity.map((activity) => (
                    <TableRow key={activity.id} data-testid={`row-activity-${activity.id}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{activity.firstName} {activity.lastName}</div>
                          <div className="text-xs text-muted-foreground">{activity.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatRoleLabel(activity.primaryRole)}</TableCell>
                      <TableCell>{activity.department || "-"}</TableCell>
                      <TableCell>
                        <Badge className={INVITE_STATUS_BADGES[activity.status]?.className || ""}>
                          {INVITE_STATUS_BADGES[activity.status]?.label || activity.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(activity.updatedAt), "MMM d, h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderQuickInviteTab = () => {
    const filteredInvites = invites.filter((item) => {
      if (inviteFilter === "all") return true;
      return item.invite.status === inviteFilter;
    });

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{inviteStats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Total Invites</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{inviteStats?.pending || 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                <Settings className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{inviteStats?.setupInProgress || 0}</p>
            <p className="text-xs text-muted-foreground">Setup In Progress</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <UserCheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{inviteStats?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Active Accounts</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold">{inviteStats?.expired || 0}</p>
            <p className="text-xs text-muted-foreground">Expired</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{inviteStats?.activationRate ? `${inviteStats.activationRate}%` : "0%"}</p>
            <p className="text-xs text-muted-foreground">Activation Rate</p>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={inviteFilter} onValueChange={setInviteFilter}>
              <SelectTrigger className="w-40" data-testid="select-invite-filter">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invites</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="link_clicked">Link Clicked</SelectItem>
                <SelectItem value="setup_started">Setup Started</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetchInvites()} data-testid="button-refresh-invites">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowInviteDialog(true)} data-testid="button-new-invite">
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Quick Invite</span>
            <span className="sm:hidden">Invite</span>
          </Button>
        </div>

        {invitesLoading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading invites...</span>
            </div>
          </Card>
        ) : filteredInvites.length === 0 ? (
          <Card className="p-8">
            <div className="text-center space-y-3">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="font-medium">No invites found</h3>
              <p className="text-sm text-muted-foreground">
                {inviteFilter === "all"
                  ? "Start by sending your first employee invite"
                  : `No invites with status "${inviteFilter}"`}
              </p>
              {inviteFilter === "all" && (
                <Button onClick={() => setShowInviteDialog(true)} data-testid="button-create-first-invite">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send First Invite
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Sent</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvites.map((item) => (
                  <TableRow key={item.invite.id} data-testid={`row-invite-${item.invite.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {item.invite.firstName} {item.invite.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.invite.email}</p>
                        {item.invite.department && (
                          <p className="text-xs text-muted-foreground">{item.invite.department}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="capitalize">
                        {item.invite.primaryRole.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={INVITE_STATUS_BADGES[item.invite.status]?.variant || "secondary"}
                        className={INVITE_STATUS_BADGES[item.invite.status]?.className}
                      >
                        {INVITE_STATUS_BADGES[item.invite.status]?.label || item.invite.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {item.invite.lastEmailSentAt ? (
                        <div className="text-sm">
                          <p>{format(new Date(item.invite.lastEmailSentAt), "MMM d, yyyy")}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.invite.emailSendCount} {item.invite.emailSendCount === 1 ? "send" : "sends"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {item.invite.lastLoginAt ? (
                        <span className="text-sm">{format(new Date(item.invite.lastLoginAt), "MMM d, h:mm a")}</span>
                      ) : item.invite.accountCreatedAt ? (
                        <span className="text-sm text-muted-foreground">Account created</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {["pending", "invited", "expired"].includes(item.invite.status) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => resendInviteMutation.mutate(item.invite.id)}
                            disabled={resendingInviteId === item.invite.id || cancellingInviteId === item.invite.id}
                            title="Resend invite"
                            data-testid={`button-resend-invite-${item.invite.id}`}
                          >
                            {resendingInviteId === item.invite.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {!["active", "cancelled"].includes(item.invite.status) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => cancelInviteMutation.mutate(item.invite.id)}
                            disabled={cancellingInviteId === item.invite.id || resendingInviteId === item.invite.id}
                            title="Cancel invite"
                            data-testid={`button-cancel-invite-${item.invite.id}`}
                          >
                            {cancellingInviteId === item.invite.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl" data-testid="page-hr-onboarding">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">HR Onboarding</h1>
        <p className="text-muted-foreground">Manage employee onboarding plans and track progress</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
          <TabsTrigger value="invites" data-testid="tab-invites">
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Quick Invite</span>
            <span className="sm:hidden">Invite</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="plans" data-testid="tab-plans">
            <ClipboardList className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Onboarding Plans</span>
            <span className="sm:hidden">Plans</span>
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Active Onboarding</span>
            <span className="sm:hidden">Active</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Link2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">HR Integrations</span>
            <span className="sm:hidden">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="imports" data-testid="tab-imports">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Import History</span>
            <span className="sm:hidden">Imports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invites">{renderQuickInviteTab()}</TabsContent>
        <TabsContent value="analytics">{renderAnalyticsTab()}</TabsContent>
        <TabsContent value="plans">{renderOnboardingPlansTab()}</TabsContent>
        <TabsContent value="active">{renderActiveOnboardingTab()}</TabsContent>
        <TabsContent value="integrations">{renderIntegrationsTab()}</TabsContent>
        <TabsContent value="imports">{renderImportHistoryTab()}</TabsContent>
      </Tabs>

      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Onboarding Plan" : "Create Onboarding Plan"}</DialogTitle>
            <DialogDescription>
              {editingPlan ? "Update the onboarding plan details" : "Create a new onboarding plan template"}
            </DialogDescription>
          </DialogHeader>
          <Form {...planForm}>
            <form onSubmit={planForm.handleSubmit(handlePlanSubmit)} className="space-y-4">
              <FormField
                control={planForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Standard Employee Onboarding" {...field} data-testid="input-plan-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={planForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe this onboarding plan..." {...field} data-testid="input-plan-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={planForm.control}
                name="estimatedDurationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Duration (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={365} {...field} data-testid="input-plan-duration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={planForm.control}
                name="targetRoles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Roles</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLE_OPTIONS.map((role) => (
                        <div key={role.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-${role.value}`}
                            checked={field.value.includes(role.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, role.value]);
                              } else {
                                field.onChange(field.value.filter((r: string) => r !== role.value));
                              }
                            }}
                            data-testid={`checkbox-role-${role.value}`}
                          />
                          <Label htmlFor={`role-${role.value}`} className="text-sm">{role.label}</Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-4">
                <FormField
                  control={planForm.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-plan-default" />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">Default plan</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={planForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-plan-active" />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">Active</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowPlanDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={createPlanMutation.isPending || updatePlanMutation.isPending} data-testid="button-save-plan">
                  {(createPlanMutation.isPending || updatePlanMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingPlan ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showStepDialog} onOpenChange={setShowStepDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStep ? "Edit Step" : "Add Step"}</DialogTitle>
            <DialogDescription>
              {editingStep ? "Update the step details" : "Add a new step to this onboarding plan"}
            </DialogDescription>
          </DialogHeader>
          <Form {...stepForm}>
            <form onSubmit={stepForm.handleSubmit(handleStepSubmit)} className="space-y-4">
              <FormField
                control={stepForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Step Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Complete HR paperwork" {...field} data-testid="input-step-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stepForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of this step..." {...field} data-testid="input-step-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stepForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-step-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STEP_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={stepForm.control}
                  name="dueDaysAfterStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due (days after start)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={365} placeholder="e.g., 3" {...field} value={field.value ?? ""} data-testid="input-step-due-days" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={stepForm.control}
                  name="estimatedMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Est. Time (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={480} placeholder="e.g., 30" {...field} value={field.value ?? ""} data-testid="input-step-time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex items-center gap-4">
                <FormField
                  control={stepForm.control}
                  name="isRequired"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-step-required" />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">Required</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={stepForm.control}
                  name="isSelfAssigned"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-step-self-assigned" />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">Self-assigned</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowStepDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={createStepMutation.isPending || updateStepMutation.isPending} data-testid="button-save-step">
                  {(createStepMutation.isPending || updateStepMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingStep ? "Update" : "Add"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showIntegrationDialog} onOpenChange={setShowIntegrationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingIntegration ? "Edit Integration" : `Connect to ${HR_PROVIDERS.find(p => p.id === selectedProvider)?.name || "HR System"}`}
            </DialogTitle>
            <DialogDescription>
              Enter your API credentials to connect with your HR system
            </DialogDescription>
          </DialogHeader>
          <Form {...integrationForm}>
            <form onSubmit={integrationForm.handleSubmit(handleIntegrationSubmit)} className="space-y-4">
              {!editingIntegration && (
                <FormField
                  control={integrationForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Main HR System" {...field} data-testid="input-integration-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={integrationForm.control}
                name="subdomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subdomain / Company ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., yourcompany" {...field} data-testid="input-integration-subdomain" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={integrationForm.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your API key" {...field} data-testid="input-integration-api-key" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={integrationForm.control}
                name="syncFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sync Frequency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-sync-frequency">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="manual">Manual Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={integrationForm.control}
                name="syncEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-auto-sync" />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">Enable auto-sync</FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowIntegrationDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={createIntegrationMutation.isPending || updateIntegrationMutation.isPending} data-testid="button-save-integration">
                  {(createIntegrationMutation.isPending || updateIntegrationMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingIntegration ? "Update" : "Connect"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) setCsvImportResults(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Employees from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with employee data to send invites
            </DialogDescription>
          </DialogHeader>
          
          {!csvImportResults ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-3">
                  <Label htmlFor="csv-upload" className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </Label>
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    data-testid="input-csv-file"
                  />
                  <div className="flex flex-col gap-2 items-center">
                    <Button
                      variant="default"
                      onClick={() => document.getElementById("csv-upload")?.click()}
                      disabled={uploadCsvMutation.isPending}
                      data-testid="button-select-file"
                    >
                      {uploadCsvMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Select CSV File
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadCsvTemplate}
                      className="text-xs"
                      data-testid="button-download-template"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download Template
                    </Button>
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">CSV Format</p>
                <p className="text-xs text-muted-foreground">
                  Required columns: <span className="font-mono">firstName, lastName, email</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Optional columns: <span className="font-mono">role, department, message</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Valid roles: viewer, surveyor, estimator, project_manager, pm_manager, manager, admin, engineer, sales_rep, technician, procurement_officer
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-2xl font-bold" data-testid="text-import-total">{csvImportResults.totalRecords}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-3 rounded-md bg-green-50 dark:bg-green-950">
                  <p className="text-2xl font-bold text-green-600" data-testid="text-import-success">{csvImportResults.successCount}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-950">
                  <p className="text-2xl font-bold text-red-600" data-testid="text-import-failed">{csvImportResults.errorCount}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
              
              {csvImportResults.results.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Results</Label>
                  <ScrollArea className="h-48 border rounded-md">
                    <div className="p-2 space-y-1">
                      {csvImportResults.results.map((result, idx) => (
                        <div 
                          key={idx} 
                          className={`p-2 rounded-md text-sm flex items-start gap-2 ${
                            result.status === "success" 
                              ? "bg-green-50 dark:bg-green-950" 
                              : "bg-red-50 dark:bg-red-950"
                          }`}
                          data-testid={`row-import-result-${idx}`}
                        >
                          {result.status === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{result.email}</p>
                            <p className="text-xs text-muted-foreground">{result.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            {csvImportResults ? (
              <Button onClick={() => { setShowImportDialog(false); setCsvImportResults(null); }} data-testid="button-close-import">
                Done
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedImportJob} onOpenChange={() => setSelectedImportJob(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Details</DialogTitle>
            <DialogDescription>
              {selectedImportJob?.sourceFileName || "Import job details"}
            </DialogDescription>
          </DialogHeader>
          {selectedImportJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={IMPORT_STATUS_BADGES[selectedImportJob.status]?.variant || "secondary"}>
                      {IMPORT_STATUS_BADGES[selectedImportJob.status]?.label || selectedImportJob.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="text-sm mt-1">{format(new Date(selectedImportJob.createdAt), "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-md bg-muted/50">
                  <p className="text-2xl font-bold">{selectedImportJob.totalRecords}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-3 rounded-md bg-green-50 dark:bg-green-950">
                  <p className="text-2xl font-bold text-green-600">{selectedImportJob.successfulImports}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="p-3 rounded-md bg-red-50 dark:bg-red-950">
                  <p className="text-2xl font-bold text-red-600">{selectedImportJob.failedImports}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
              {selectedImportJob.errors && selectedImportJob.errors.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Errors</Label>
                  <div className="max-h-48 overflow-auto space-y-2">
                    {selectedImportJob.errors.map((error, idx) => (
                      <div key={idx} className="p-2 rounded-md bg-red-50 dark:bg-red-950 text-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            {error.row && <span className="font-medium">Row {error.row}: </span>}
                            {error.field && <span className="text-muted-foreground">[{error.field}] </span>}
                            {error.message}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedImportJob(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quick Employee Invite</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new team member
            </DialogDescription>
          </DialogHeader>
          <Form {...inviteForm}>
            <form onSubmit={inviteForm.handleSubmit((data) => createInviteMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={inviteForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} data-testid="input-invite-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={inviteForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} data-testid="input-invite-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={inviteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.smith@company.com" {...field} data-testid="input-invite-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={inviteForm.control}
                  name="primaryRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-invite-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="pm_manager">PM Manager</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="project_manager">Project Manager</SelectItem>
                          <SelectItem value="engineer">Engineer</SelectItem>
                          <SelectItem value="sales_rep">Sales Rep</SelectItem>
                          <SelectItem value="procurement_officer">Procurement Officer</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={inviteForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Engineering" {...field} data-testid="input-invite-department" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={inviteForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1 (555) 123-4567" {...field} data-testid="input-invite-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="onboardingPlanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Onboarding Plan (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-invite-plan">
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="inviteMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a personal welcome message..."
                        className="resize-none"
                        {...field}
                        data-testid="input-invite-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={inviteForm.control}
                name="sendEmail"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-send-email" />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">Send invitation email immediately</FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowInviteDialog(false); inviteForm.reset(); }}>Cancel</Button>
                <Button type="submit" disabled={createInviteMutation.isPending} data-testid="button-send-invite">
                  {createInviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Send className="h-4 w-4 mr-2" />
                  Send Invite
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeletePlanDialog} onOpenChange={setShowDeletePlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Onboarding Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingPlan?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletePlanDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingPlan && deletePlanMutation.mutate(deletingPlan.id)}
              disabled={deletePlanMutation.isPending}
              data-testid="button-confirm-delete-plan"
            >
              {deletePlanMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteStepDialog} onOpenChange={setShowDeleteStepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Step</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingStep?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteStepDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingStep && currentPlanIdForStep && deleteStepMutation.mutate({ planId: currentPlanIdForStep, stepId: deletingStep.id })}
              disabled={deleteStepMutation.isPending}
              data-testid="button-confirm-delete-step"
            >
              {deleteStepMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
