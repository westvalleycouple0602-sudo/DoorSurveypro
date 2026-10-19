import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Briefcase,
  Users,
  Shield,
  Building2,
  ChevronRight,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  Calendar,
  UserPlus,
  Crown,
  ShieldCheck,
  ClipboardList,
  Wrench,
  DollarSign,
  ShoppingCart,
  HardHat,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  User,
  Network,
  LockKeyhole,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useAppUser as useAuth } from "@/hooks/use-app-user";
import {
  ROLE_LABELS,
  DEFAULT_ROLE_PERMISSIONS,
  hasPermission,
  type MembershipRole,
  type FeaturePermission,
} from "@shared/permissions";
import type {
  CorporateJobTitle,
  UserJobTitleAssignment,
} from "@shared/schema";

const DEPARTMENT_LABELS: Record<string, string> = {
  executive: "Executive",
  operations: "Operations",
  sales: "Sales",
  engineering: "Engineering",
  field_services: "Field Services",
  purchasing: "Purchasing",
  administrative: "Administrative",
  finance: "Finance",
  human_resources: "Human Resources",
  it: "Information Technology",
  quality_assurance: "Quality Assurance",
};

const INDUSTRY_LABELS: Record<string, string> = {
  div_8_openings: "Division 8 - Openings",
  div_28_electronic: "Division 28 - Electronic Security",
  div_8_28_combined: "Division 8 & 28 Combined",
  general: "General",
};

const DEPARTMENT_COLORS: Record<string, string> = {
  executive: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  operations: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sales: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  engineering: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  field_services: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  purchasing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  administrative: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  finance: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  human_resources: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  it: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  quality_assurance: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
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

const HIERARCHY_LEVELS = [
  { value: 100, label: "C-Suite (100)" },
  { value: 90, label: "Vice President (90)" },
  { value: 80, label: "Director (80)" },
  { value: 70, label: "Senior Manager (70)" },
  { value: 60, label: "Manager (60)" },
  { value: 50, label: "Senior (50)" },
  { value: 40, label: "Standard (40)" },
  { value: 30, label: "Associate (30)" },
  { value: 20, label: "Junior (20)" },
  { value: 10, label: "Entry Level (10)" },
];

const DEPARTMENT_CATEGORIES = [
  "executive",
  "operations",
  "sales",
  "engineering",
  "field_services",
  "purchasing",
  "administrative",
  "finance",
  "human_resources",
  "it",
  "quality_assurance",
] as const;

const INDUSTRY_SPECIALIZATIONS = [
  "div_8_openings",
  "div_28_electronic",
  "div_8_28_combined",
  "general",
] as const;

const MEMBERSHIP_ROLES = [
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
] as const;

const jobTitleFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  departmentCategory: z.enum(DEPARTMENT_CATEGORIES as unknown as [string, ...string[]]),
  industrySpecialization: z.enum(INDUSTRY_SPECIALIZATIONS as unknown as [string, ...string[]]).default("general"),
  primaryRole: z.enum(MEMBERSHIP_ROLES as unknown as [string, ...string[]]),
  assignedRoles: z.array(z.string()).default([]),
  hierarchyLevel: z.coerce.number().min(10).max(100).default(50),
  isActive: z.boolean().default(true),
});

const assignmentFormSchema = z.object({
  userId: z.string().min(1, "User is required"),
  jobTitleId: z.string().min(1, "Job title is required"),
  effectiveDate: z.string().optional(),
  isPrimary: z.boolean().default(true),
  reportsToUserId: z.string().optional(),
  assignmentReason: z.string().optional(),
});

type JobTitleFormData = z.infer<typeof jobTitleFormSchema>;
type AssignmentFormData = z.infer<typeof assignmentFormSchema>;

interface JobTitleAssignmentWithDetails extends UserJobTitleAssignment {
  user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  jobTitle: {
    id: string;
    title: string;
    departmentCategory: string;
    hierarchyLevel: number;
    assignedRoles: string[];
    primaryRole: string;
  };
}

interface TeamMember {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  roles: string[];
  profileImageUrl: string | null;
}

function RoleBadge({ role }: { role: string }) {
  const RoleIcon = ROLE_ICONS[role] || User;
  return (
    <Badge variant="outline" className="text-xs shrink-0 gap-1">
      <RoleIcon className="h-3 w-3 shrink-0" />
      {ROLE_LABELS[role as MembershipRole] || role}
    </Badge>
  );
}

function JobTitleSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PermissionBadgeList({ permissions }: { permissions: FeaturePermission[] }) {
  const displayCount = 3;
  const displayPermissions = permissions.slice(0, displayCount);
  const hiddenCount = permissions.length - displayCount;

  return (
    <div className="flex flex-wrap gap-1">
      {displayPermissions.map((permission) => (
        <Badge key={permission} variant="outline" className="text-xs">
          {permission.replace(/_/g, " ")}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{hiddenCount} more
        </Badge>
      )}
    </div>
  );
}

export default function JobTitles() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState("library");

  const [showJobTitleDialog, setShowJobTitleDialog] = useState(false);
  const [editingJobTitle, setEditingJobTitle] = useState<CorporateJobTitle | null>(null);
  const [viewingJobTitle, setViewingJobTitle] = useState<CorporateJobTitle | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingJobTitle, setDeletingJobTitle] = useState<CorporateJobTitle | null>(null);

  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<JobTitleAssignmentWithDetails | null>(null);
  const [showDeleteAssignmentDialog, setShowDeleteAssignmentDialog] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<JobTitleAssignmentWithDetails | null>(null);

  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const userRoles = authUser?.role ? [authUser.role as MembershipRole] : ["viewer" as MembershipRole];
  const isAdmin = hasPermission(userRoles, "manage_team");

  const { data: jobTitles = [], isLoading: jobTitlesLoading, isError: jobTitlesError, error: jobTitlesErrorObj, refetch: refetchJobTitles } = useQuery<CorporateJobTitle[]>({
    queryKey: ["/api/job-titles"],
  });

  const { data: assignments = [], isLoading: assignmentsLoading, isError: assignmentsError, error: assignmentsErrorObj, refetch: refetchAssignments } = useQuery<JobTitleAssignmentWithDetails[]>({
    queryKey: ["/api/job-titles/assignments"],
    enabled: isAdmin,
  });

  const { data: teamMembers = [], isLoading: teamMembersLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team/members"],
    enabled: isAdmin,
  });

  const filteredJobTitles = useMemo(() => {
    return jobTitles.filter((jt) => {
      if (departmentFilter !== "all" && jt.departmentCategory !== departmentFilter) return false;
      if (industryFilter !== "all" && jt.industrySpecialization !== industryFilter) return false;
      if (statusFilter === "active" && !jt.isActive) return false;
      if (statusFilter === "inactive" && jt.isActive) return false;
      if (statusFilter === "system" && !jt.isSystemTemplate) return false;
      if (statusFilter === "custom" && jt.isSystemTemplate) return false;
      if (searchQuery && !jt.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [jobTitles, departmentFilter, industryFilter, statusFilter, searchQuery]);

  const groupedJobTitles = useMemo(() => {
    const groups: Record<string, CorporateJobTitle[]> = {};
    filteredJobTitles.forEach((jt) => {
      const dept = jt.departmentCategory || "other";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(jt);
    });
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => (b.hierarchyLevel || 0) - (a.hierarchyLevel || 0));
    });
    return groups;
  }, [filteredJobTitles]);

  const jobTitleForm = useForm<JobTitleFormData>({
    resolver: zodResolver(jobTitleFormSchema),
    defaultValues: {
      title: "",
      description: "",
      departmentCategory: "operations",
      industrySpecialization: "general",
      primaryRole: "technician",
      assignedRoles: [],
      hierarchyLevel: 50,
      isActive: true,
    },
  });

  const assignmentForm = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      userId: "",
      jobTitleId: "",
      effectiveDate: new Date().toISOString().split("T")[0],
      isPrimary: true,
      reportsToUserId: "",
      assignmentReason: "",
    },
  });

  const createJobTitleMutation = useMutation({
    mutationFn: async (data: JobTitleFormData) => {
      const res = await apiRequest("POST", "/api/job-titles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-titles"] });
      setShowJobTitleDialog(false);
      jobTitleForm.reset();
      toast({ title: "Success", description: "Job title created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateJobTitleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: JobTitleFormData }) => {
      const res = await apiRequest("PATCH", `/api/job-titles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-titles"] });
      setShowJobTitleDialog(false);
      setEditingJobTitle(null);
      jobTitleForm.reset();
      toast({ title: "Success", description: "Job title updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteJobTitleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/job-titles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-titles"] });
      setShowDeleteDialog(false);
      setDeletingJobTitle(null);
      toast({ title: "Success", description: "Job title deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const copyJobTitleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/job-titles/${id}/copy`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-titles"] });
      toast({ title: "Success", description: "Template copied successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const res = await apiRequest("POST", "/api/job-titles/assignments", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-titles/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      setShowAssignDialog(false);
      assignmentForm.reset();
      toast({ title: "Success", description: "Job title assigned successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AssignmentFormData> }) => {
      const res = await apiRequest("PATCH", `/api/job-titles/assignments/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-titles/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      setShowAssignDialog(false);
      setEditingAssignment(null);
      assignmentForm.reset();
      toast({ title: "Success", description: "Assignment updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/job-titles/assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-titles/assignments"] });
      setShowDeleteAssignmentDialog(false);
      setDeletingAssignment(null);
      toast({ title: "Success", description: "Assignment removed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenJobTitleDialog = (jobTitle?: CorporateJobTitle) => {
    if (jobTitle) {
      setEditingJobTitle(jobTitle);
      jobTitleForm.reset({
        title: jobTitle.title,
        description: jobTitle.description || "",
        departmentCategory: jobTitle.departmentCategory as any,
        industrySpecialization: (jobTitle.industrySpecialization || "general") as any,
        primaryRole: jobTitle.primaryRole as any,
        assignedRoles: jobTitle.assignedRoles || [],
        hierarchyLevel: jobTitle.hierarchyLevel,
        isActive: jobTitle.isActive,
      });
    } else {
      setEditingJobTitle(null);
      jobTitleForm.reset();
    }
    setShowJobTitleDialog(true);
  };

  const handleJobTitleSubmit = (data: JobTitleFormData) => {
    if (editingJobTitle) {
      updateJobTitleMutation.mutate({ id: editingJobTitle.id, data });
    } else {
      createJobTitleMutation.mutate(data);
    }
  };

  const handleOpenAssignDialog = (assignment?: JobTitleAssignmentWithDetails) => {
    if (assignment) {
      setEditingAssignment(assignment);
      assignmentForm.reset({
        userId: assignment.userId,
        jobTitleId: assignment.jobTitleId,
        effectiveDate: assignment.effectiveDate ? format(new Date(assignment.effectiveDate), "yyyy-MM-dd") : undefined,
        isPrimary: assignment.isPrimary,
        reportsToUserId: assignment.reportsToUserId || "",
        assignmentReason: assignment.assignmentReason || "",
      });
    } else {
      setEditingAssignment(null);
      assignmentForm.reset({
        userId: "",
        jobTitleId: "",
        effectiveDate: new Date().toISOString().split("T")[0],
        isPrimary: true,
        reportsToUserId: "",
        assignmentReason: "",
      });
    }
    setShowAssignDialog(true);
  };

  const handleAssignmentSubmit = (data: AssignmentFormData) => {
    if (editingAssignment) {
      updateAssignmentMutation.mutate({ id: editingAssignment.id, data });
    } else {
      createAssignmentMutation.mutate(data);
    }
  };

  const handleViewDetails = (jobTitle: CorporateJobTitle) => {
    setViewingJobTitle(jobTitle);
    setShowDetailsDialog(true);
  };

  const handleConfirmDelete = (jobTitle: CorporateJobTitle) => {
    setDeletingJobTitle(jobTitle);
    setShowDeleteDialog(true);
  };

  const handleConfirmDeleteAssignment = (assignment: JobTitleAssignmentWithDetails) => {
    setDeletingAssignment(assignment);
    setShowDeleteAssignmentDialog(true);
  };

  if (jobTitlesError) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load job titles"
          error={jobTitlesErrorObj as Error}
          onRetry={refetchJobTitles}
          testId="error-job-titles"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Corporate Job Titles</h1>
          <p className="text-muted-foreground">Manage job titles and role assignments for your organization</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => handleOpenJobTitleDialog()}
            data-testid="button-create-job-title"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Job Title
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList data-testid="tabs-job-titles">
          <TabsTrigger value="library" data-testid="tab-library">
            <Briefcase className="h-4 w-4 mr-2" />
            Job Title Library
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="assignments" data-testid="tab-assignments">
              <Users className="h-4 w-4 mr-2" />
              Team Assignments
            </TabsTrigger>
          )}
          <TabsTrigger value="mapping" data-testid="tab-mapping">
            <Shield className="h-4 w-4 mr-2" />
            Role Mapping
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">Job Title Library</CardTitle>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search titles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-48"
                      data-testid="input-search-job-titles"
                    />
                  </div>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-40" data-testid="select-department-filter">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={industryFilter} onValueChange={setIndustryFilter}>
                    <SelectTrigger className="w-40" data-testid="select-industry-filter">
                      <SelectValue placeholder="Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="system">System Templates</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {jobTitlesLoading ? (
                <JobTitleSkeleton />
              ) : filteredJobTitles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No job titles found</p>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => handleOpenJobTitleDialog()}
                      data-testid="button-create-job-title-empty"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Job Title
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6" data-testid="table-job-titles">
                  {Object.entries(groupedJobTitles).map(([dept, titles]) => (
                    <div key={dept} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={DEPARTMENT_COLORS[dept] || "bg-gray-100"}>
                          {DEPARTMENT_LABELS[dept] || dept}
                        </Badge>
                        <span className="text-sm text-muted-foreground">({titles.length})</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Industry</TableHead>
                            <TableHead>Primary Role</TableHead>
                            <TableHead>All Roles</TableHead>
                            <TableHead>Level</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {titles.map((jt) => (
                            <TableRow key={jt.id} data-testid={`row-job-title-${jt.id}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{jt.title}</span>
                                  {jt.isSystemTemplate && (
                                    <Badge variant="secondary" className="text-xs">
                                      Template
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {INDUSTRY_LABELS[jt.industrySpecialization || "general"]}
                                </span>
                              </TableCell>
                              <TableCell>
                                <RoleBadge role={jt.primaryRole} />
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {(jt.assignedRoles || []).slice(0, 2).map((role) => (
                                    <RoleBadge key={role} role={role} />
                                  ))}
                                  {(jt.assignedRoles || []).length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{(jt.assignedRoles || []).length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{jt.hierarchyLevel}</span>
                              </TableCell>
                              <TableCell>
                                {jt.isActive ? (
                                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Active
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inactive
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewDetails(jt)}
                                    aria-label="View job title details"
                                    data-testid={`button-view-job-title-${jt.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {jt.isSystemTemplate && isAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => copyJobTitleMutation.mutate(jt.id)}
                                      disabled={copyJobTitleMutation.isPending}
                                      aria-label="Copy job title"
                                      data-testid={`button-copy-job-title-${jt.id}`}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {!jt.isSystemTemplate && isAdmin && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenJobTitleDialog(jt)}
                                        aria-label="Edit job title"
                                        data-testid={`button-edit-job-title-${jt.id}`}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleConfirmDelete(jt)}
                                        aria-label="Delete job title"
                                        data-testid={`button-delete-job-title-${jt.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg">Team Assignments</CardTitle>
                    <CardDescription>Assign job titles to team members and manage reporting structures</CardDescription>
                  </div>
                  <Button
                    onClick={() => handleOpenAssignDialog()}
                    data-testid="button-assign-job-title"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Assign Job Title
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {assignmentsLoading ? (
                  <JobTitleSkeleton />
                ) : assignmentsError ? (
                  <ErrorState
                    title="Failed to load assignments"
                    error={assignmentsErrorObj as Error}
                    onRetry={refetchAssignments}
                    testId="error-assignments"
                  />
                ) : assignments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No job title assignments yet</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => handleOpenAssignDialog()}
                      data-testid="button-assign-job-title-empty"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign First Job Title
                    </Button>
                  </div>
                ) : (
                  <Table data-testid="table-assignments">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Member</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Primary Role</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead>Reports To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => {
                        const manager = assignment.reportsToUserId
                          ? assignments.find((a) => a.userId === assignment.reportsToUserId)
                          : null;
                        return (
                          <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {(assignment.user?.firstName?.[0] || "") + (assignment.user?.lastName?.[0] || "")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {assignment.user?.firstName} {assignment.user?.lastName}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {assignment.user?.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{assignment.jobTitle?.title}</span>
                                {assignment.isPrimary && (
                                  <Badge variant="secondary" className="text-xs">
                                    Primary
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <RoleBadge role={assignment.jobTitle?.primaryRole || "viewer"} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {assignment.effectiveDate
                                  ? format(new Date(assignment.effectiveDate), "MMM d, yyyy")
                                  : "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {manager ? (
                                <span className="text-sm">
                                  {manager.user?.firstName} {manager.user?.lastName}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {assignment.isActive ? (
                                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenAssignDialog(assignment)}
                                  aria-label="Edit assignment"
                                  data-testid={`button-edit-assignment-${assignment.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleConfirmDeleteAssignment(assignment)}
                                  aria-label="Delete assignment"
                                  data-testid={`button-delete-assignment-${assignment.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Organization Hierarchy
                </CardTitle>
                <CardDescription>Visual representation of reporting structure</CardDescription>
              </CardHeader>
              <CardContent>
                {assignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Network className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No hierarchy to display</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignments
                      .filter((a) => !a.reportsToUserId)
                      .sort((a, b) => (b.jobTitle?.hierarchyLevel || 0) - (a.jobTitle?.hierarchyLevel || 0))
                      .map((topLevel) => (
                        <div key={topLevel.id} className="border rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {(topLevel.user?.firstName?.[0] || "") + (topLevel.user?.lastName?.[0] || "")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">
                                {topLevel.user?.firstName} {topLevel.user?.lastName}
                              </p>
                              <p className="text-sm text-muted-foreground">{topLevel.jobTitle?.title}</p>
                            </div>
                            <RoleBadge role={topLevel.jobTitle?.primaryRole || "viewer"} />
                          </div>
                          {assignments.filter((a) => a.reportsToUserId === topLevel.userId).length > 0 && (
                            <div className="ml-8 mt-3 pl-4 border-l-2 space-y-2">
                              {assignments
                                .filter((a) => a.reportsToUserId === topLevel.userId)
                                .map((report) => (
                                  <div key={report.id} className="flex items-center gap-3 py-1">
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {(report.user?.firstName?.[0] || "") + (report.user?.lastName?.[0] || "")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">
                                        {report.user?.firstName} {report.user?.lastName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{report.jobTitle?.title}</p>
                                    </div>
                                    <RoleBadge role={report.jobTitle?.primaryRole || "viewer"} />
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role & Permission Mapping
              </CardTitle>
              <CardDescription>
                View how job titles map to application roles and the permissions each role grants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(ROLE_LABELS).map(([role, label]) => {
                  const RoleIcon = ROLE_ICONS[role] || User;
                  const permissions = DEFAULT_ROLE_PERMISSIONS[role as MembershipRole] || [];
                  const jobTitlesWithRole = jobTitles.filter(
                    (jt) => jt.primaryRole === role || (jt.assignedRoles || []).includes(role)
                  );

                  return (
                    <Card key={role} className="overflow-hidden" data-testid={`card-role-mapping-${role}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <RoleIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{label}</CardTitle>
                            <CardDescription className="text-xs">
                              {permissions.length} permissions
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {jobTitlesWithRole.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              Job Titles with this role:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {jobTitlesWithRole.slice(0, 3).map((jt) => (
                                <Badge key={jt.id} variant="secondary" className="text-xs">
                                  {jt.title}
                                </Badge>
                              ))}
                              {jobTitlesWithRole.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{jobTitlesWithRole.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Key Permissions:
                          </p>
                          <PermissionBadgeList permissions={permissions} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LockKeyhole className="h-5 w-5" />
                Permission Reference
              </CardTitle>
              <CardDescription>Complete list of available permissions in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(DEFAULT_ROLE_PERMISSIONS.owner || []).map(([_, permission]) => (
                    <Badge
                      key={permission}
                      variant="outline"
                      className="text-xs justify-start"
                    >
                      {permission.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showJobTitleDialog} onOpenChange={setShowJobTitleDialog}>
        <DialogContent className="max-w-xl" data-testid="dialog-job-title-form">
          <DialogHeader>
            <DialogTitle>
              {editingJobTitle ? "Edit Job Title" : "Create Job Title"}
            </DialogTitle>
            <DialogDescription>
              {editingJobTitle
                ? "Modify the job title details and role mappings"
                : "Create a new custom job title for your organization"}
            </DialogDescription>
          </DialogHeader>
          <Form {...jobTitleForm}>
            <form onSubmit={jobTitleForm.handleSubmit(handleJobTitleSubmit)} className="space-y-4">
              <FormField
                control={jobTitleForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Senior Project Manager"
                        {...field}
                        data-testid="input-job-title-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={jobTitleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the responsibilities and scope of this job title"
                        {...field}
                        data-testid="input-job-title-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 grid-cols-2">
                <FormField
                  control={jobTitleForm.control}
                  name="departmentCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-department">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={jobTitleForm.control}
                  name="industrySpecialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-industry">
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <FormField
                  control={jobTitleForm.control}
                  name="primaryRole"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Role</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-primary-role">
                            <SelectValue placeholder="Select primary role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The main application role for this job title
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={jobTitleForm.control}
                  name="hierarchyLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hierarchy Level</FormLabel>
                      <Select
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(parseInt(v))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-hierarchy-level">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {HIERARCHY_LEVELS.map(({ value, label }) => (
                            <SelectItem key={value} value={String(value)}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={jobTitleForm.control}
                name="assignedRoles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Roles</FormLabel>
                    <FormDescription>
                      Select additional roles this job title should have access to
                    </FormDescription>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(ROLE_LABELS).map(([role, label]) => (
                        <div key={role} className="flex items-center space-x-2">
                          <Checkbox
                            id={`role-${role}`}
                            checked={field.value?.includes(role)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, role]);
                              } else {
                                field.onChange(current.filter((r) => r !== role));
                              }
                            }}
                            data-testid={`checkbox-role-${role}`}
                          />
                          <label
                            htmlFor={`role-${role}`}
                            className="text-sm cursor-pointer"
                          >
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={jobTitleForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Inactive job titles cannot be assigned to users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowJobTitleDialog(false);
                    setEditingJobTitle(null);
                    jobTitleForm.reset();
                  }}
                  data-testid="button-cancel-job-title"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createJobTitleMutation.isPending || updateJobTitleMutation.isPending}
                  data-testid="button-submit-job-title"
                >
                  {(createJobTitleMutation.isPending || updateJobTitleMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingJobTitle ? "Save Changes" : "Create Job Title"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg" data-testid="dialog-job-title-details">
          <DialogHeader>
            <DialogTitle>{viewingJobTitle?.title}</DialogTitle>
            <DialogDescription>
              Job title details and role mappings
            </DialogDescription>
          </DialogHeader>
          {viewingJobTitle && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={DEPARTMENT_COLORS[viewingJobTitle.departmentCategory] || "bg-gray-100"}>
                  {DEPARTMENT_LABELS[viewingJobTitle.departmentCategory]}
                </Badge>
                <Badge variant="outline">
                  {INDUSTRY_LABELS[viewingJobTitle.industrySpecialization || "general"]}
                </Badge>
                {viewingJobTitle.isSystemTemplate && (
                  <Badge variant="secondary">System Template</Badge>
                )}
              </div>

              {viewingJobTitle.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{viewingJobTitle.description}</p>
                </div>
              )}

              <div className="grid gap-4 grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Hierarchy Level</Label>
                  <p className="text-sm font-medium mt-1">
                    {HIERARCHY_LEVELS.find((h) => h.value === viewingJobTitle.hierarchyLevel)?.label ||
                      `Level ${viewingJobTitle.hierarchyLevel}`}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="mt-1">
                    {viewingJobTitle.isActive ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Primary Role</Label>
                <div className="mt-2">
                  <RoleBadge role={viewingJobTitle.primaryRole} />
                </div>
              </div>

              {(viewingJobTitle.assignedRoles || []).length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Additional Roles</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(viewingJobTitle.assignedRoles || []).map((role) => (
                      <RoleBadge key={role} role={role} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Permissions Granted</Label>
                <ScrollArea className="h-32 mt-2">
                  <div className="flex flex-wrap gap-1">
                    {(DEFAULT_ROLE_PERMISSIONS[viewingJobTitle.primaryRole as MembershipRole] || []).map(
                      (permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission.replace(/_/g, " ")}
                        </Badge>
                      )
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
              data-testid="button-close-details"
            >
              Close
            </Button>
            {viewingJobTitle && !viewingJobTitle.isSystemTemplate && isAdmin && (
              <Button
                onClick={() => {
                  setShowDetailsDialog(false);
                  handleOpenJobTitleDialog(viewingJobTitle);
                }}
                data-testid="button-edit-from-details"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {viewingJobTitle && viewingJobTitle.isSystemTemplate && isAdmin && (
              <Button
                onClick={() => {
                  setShowDetailsDialog(false);
                  copyJobTitleMutation.mutate(viewingJobTitle.id);
                }}
                disabled={copyJobTitleMutation.isPending}
                data-testid="button-copy-from-details"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Template
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent data-testid="dialog-delete-job-title">
          <DialogHeader>
            <DialogTitle>Delete Job Title</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingJobTitle?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletingJobTitle(null);
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingJobTitle && deleteJobTitleMutation.mutate(deletingJobTitle.id)}
              disabled={deleteJobTitleMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteJobTitleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-assign-job-title">
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? "Edit Assignment" : "Assign Job Title"}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment
                ? "Modify the job title assignment"
                : "Assign a job title to a team member"}
            </DialogDescription>
          </DialogHeader>
          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(handleAssignmentSubmit)} className="space-y-4">
              <FormField
                control={assignmentForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Member</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!editingAssignment}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-user">
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.firstName} {member.lastName} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={assignmentForm.control}
                name="jobTitleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-job-title-assign">
                          <SelectValue placeholder="Select job title" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {jobTitles
                          .filter((jt) => jt.isActive)
                          .map((jt) => (
                            <SelectItem key={jt.id} value={jt.id}>
                              {jt.title} ({DEPARTMENT_LABELS[jt.departmentCategory]})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={assignmentForm.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-effective-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={assignmentForm.control}
                name="reportsToUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reports To</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-reports-to">
                          <SelectValue placeholder="Select manager (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Manager</SelectItem>
                        {teamMembers
                          .filter((m) => m.id !== assignmentForm.watch("userId"))
                          .map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.firstName} {member.lastName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={assignmentForm.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Primary Assignment</FormLabel>
                      <FormDescription>
                        This will be the user's main job title
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-primary"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={assignmentForm.control}
                name="assignmentReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Promotion, New hire, Role change"
                        {...field}
                        data-testid="input-assignment-reason"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAssignDialog(false);
                    setEditingAssignment(null);
                    assignmentForm.reset();
                  }}
                  data-testid="button-cancel-assignment"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAssignmentMutation.isPending || updateAssignmentMutation.isPending}
                  data-testid="button-submit-assignment"
                >
                  {(createAssignmentMutation.isPending || updateAssignmentMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingAssignment ? "Save Changes" : "Assign"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteAssignmentDialog} onOpenChange={setShowDeleteAssignmentDialog}>
        <DialogContent data-testid="dialog-delete-assignment">
          <DialogHeader>
            <DialogTitle>Remove Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the job title assignment for{" "}
              {deletingAssignment?.user?.firstName} {deletingAssignment?.user?.lastName}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteAssignmentDialog(false);
                setDeletingAssignment(null);
              }}
              data-testid="button-cancel-delete-assignment"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingAssignment && deleteAssignmentMutation.mutate(deletingAssignment.id)}
              disabled={deleteAssignmentMutation.isPending}
              data-testid="button-confirm-delete-assignment"
            >
              {deleteAssignmentMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
