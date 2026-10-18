import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  FileText,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Eye,
  ArrowRight,
  Loader2,
  Trophy,
  X,
  List,
  Columns3,
  BarChart3,
  PieChart,
  Building2,
  Briefcase,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Lead, SalesActivity } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SalesReports {
  summary: {
    totalLeads: number;
    activeLeads: number;
    wonDeals: number;
    lostDeals: number;
    winRate: number;
    totalWonRevenue: number;
    totalPipelineValue: number;
    weightedPipeline: number;
    avgDealSize: number;
  };
  pipelineStages: { stage: string; count: number; value: number }[];
  sourceAnalysis: { source: string; total: number; won: number; value: number; conversionRate: number }[];
  industryBreakdown: { industry: string; count: number; value: number }[];
  repPerformance: { repId: string; leads: number; won: number; value: number; winRate: number }[];
  trends: { week: string; newLeads: number; wonDeals: number; revenue: number }[];
  topDeals: { id: string; company: string; contact: string; value: number; status: string; industry: string | null }[];
  recentWins: { id: string; company: string; contact: string; value: number; industry: string | null; closedAt: string | null }[];
}
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ErrorState } from "@/components/error-state";
import { useDebounce } from "@/hooks/use-debounce";

export default function SalesPage() {
  const { toast } = useToast();
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch leads
  const { data: leads = [], isLoading, isError, error, refetch } = useQuery<Lead[]>({
    queryKey: ["/api/sales/leads"],
  });

  // Fetch activities for selected lead
  const { data: activities = [] } = useQuery<SalesActivity[]>({
    queryKey: ["/api/sales/activities/lead", selectedLead?.id],
    enabled: !!selectedLead,
  });

  // Fetch sales reports
  const { data: reportsData, isLoading: reportsLoading, isError: reportsError, refetch: refetchReports } = useQuery<SalesReports>({
    queryKey: ["/api/sales/reports"],
  });

  // Update lead mutation
  const updateLead = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) =>
      apiRequest("PATCH", `/api/sales/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/leads"] });
      toast({
        title: "Success",
        description: "Lead updated successfully. The changes are now reflected in your pipeline.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update lead",
        description: error.message || "Unable to save lead changes. Please verify all fields and try again.",
        variant: "destructive",
      });
    },
  });

  // Create activity mutation
  const createActivity = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/sales/activities", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/activities/lead", selectedLead?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/leads"] });
      toast({
        title: "Success",
        description: "Sales activity logged successfully. The activity timeline has been updated.",
      });
      setActivityDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to log activity",
        description: error.message || "Unable to record sales activity. Please check your input and try again.",
        variant: "destructive",
      });
    },
  });

  // Delete lead mutation
  const deleteLead = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/sales/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales/leads"] });
      toast({
        title: "Success",
        description: "Lead deleted successfully. It has been removed from your pipeline.",
      });
      setSelectedLead(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete lead",
        description: error.message || "Unable to remove lead. It may be associated with active sales activities.",
        variant: "destructive",
      });
    },
  });

  // Calculate metrics
  const metrics = {
    totalLeads: leads.length,
    newLeads: leads.filter((l) => l.status === "new").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    won: leads.filter((l) => l.status === "won").length,
    totalValue: leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0),
    conversionRate:
      leads.length > 0 ? ((leads.filter((l) => l.status === "won").length / leads.length) * 100).toFixed(1) : 0,
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    if (statusFilter !== "all" && lead.status !== statusFilter) return false;
    if (debouncedSearch && !lead.contactName.toLowerCase().includes(debouncedSearch.toLowerCase()) && 
        !lead.email.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
        !(lead.companyName || "").toLowerCase().includes(debouncedSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Group leads by status for pipeline view
  const pipeline = {
    new: leads.filter((l) => l.status === "new"),
    contacted: leads.filter((l) => l.status === "contacted"),
    qualified: leads.filter((l) => l.status === "qualified"),
    proposal: leads.filter((l) => l.status === "proposal"),
    negotiation: leads.filter((l) => l.status === "negotiation"),
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    new: { label: "New", color: "bg-blue-500", icon: Eye },
    contacted: { label: "Contacted", color: "bg-purple-500", icon: Phone },
    qualified: { label: "Qualified", color: "bg-yellow-500", icon: Target },
    proposal: { label: "Proposal", color: "bg-orange-500", icon: FileText },
    negotiation: { label: "Negotiation", color: "bg-pink-500", icon: DollarSign },
    won: { label: "Won", color: "bg-green-500", icon: CheckCircle2 },
    lost: { label: "Lost", color: "bg-red-500", icon: XCircle },
    unqualified: { label: "Unqualified", color: "bg-gray-500", icon: XCircle },
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, color: "bg-gray-500", icon: FileText };
    const Icon = config.icon;
    return (
      <Badge className={config.color} data-testid={`badge-status-${status}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Show error state
  if (isError) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <ErrorState
          title="Failed to load leads"
          message={error instanceof Error ? error.message : "Unable to fetch sales pipeline data. Please check your connection and try again."}
          error={error as Error}
          onRetry={refetch}
          testId="error-sales-leads"
          fullPage
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 rounded shrink-0" />
              <Skeleton className="h-6 sm:h-8 w-40 sm:w-64" />
            </div>
            <Skeleton className="h-3 sm:h-4 w-48 sm:w-72" />
          </div>
        </div>
        
        {/* Metrics Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={`stats-${i}`} className="rounded-lg border p-3 sm:p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-3 sm:h-4 w-20 sm:w-32" />
                <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 rounded shrink-0" />
              </div>
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-20 mt-2" />
              <Skeleton className="h-3 w-24 sm:w-40 mt-2" />
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Skeleton className="h-10 flex-1 sm:flex-none sm:w-64" />
          <Skeleton className="h-10 w-full sm:w-40" />
        </div>

        {/* Tabs */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-10 sm:w-24" />
            <Skeleton className="h-9 w-10 sm:w-24" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={`card-${i}`} className="rounded-lg border p-3 sm:p-6 space-y-3">
                <Skeleton className="h-5 sm:h-6 w-3/4" />
                <Skeleton className="h-3 sm:h-4 w-full" />
                <Skeleton className="h-3 sm:h-4 w-5/6" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-7 sm:h-8 w-16 sm:w-20" />
                  <Skeleton className="h-7 sm:h-8 w-16 sm:w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-primary shrink-0" />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Sales Dashboard</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">Track and manage your sales pipeline</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{metrics.totalLeads}</div>
            <p className="text-xs text-muted-foreground">{metrics.newLeads} new this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Qualified Leads</CardTitle>
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{metrics.qualified}</div>
            <p className="text-xs text-muted-foreground">Ready for proposal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">${metrics.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Estimated revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{metrics.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">{metrics.won} deals closed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 sm:flex-none sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-leads"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2 shrink-0" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="negotiation">Negotiation</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="list" className="space-y-4 sm:space-y-6">
        <TabsList>
          <TabsTrigger value="list" className="text-xs sm:text-sm" data-testid="tab-list">
            <List className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Lead List</span>
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="text-xs sm:text-sm" data-testid="tab-pipeline">
            <Columns3 className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Pipeline View</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm" data-testid="tab-reports">
            <BarChart3 className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg">All Leads</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage and track your sales leads</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                  <p className="text-muted-foreground">Loading leads...</p>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-medium mb-2">No leads found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Contact</TableHead>
                        <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Company</TableHead>
                        <TableHead className="text-xs sm:text-sm">Status</TableHead>
                        <TableHead className="hidden md:table-cell text-xs sm:text-sm">Source</TableHead>
                        <TableHead className="hidden lg:table-cell text-xs sm:text-sm">Value</TableHead>
                        <TableHead className="hidden xl:table-cell text-xs sm:text-sm">Last Contact</TableHead>
                        <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeads.map((lead) => (
                        <TableRow key={lead.id} data-testid={`row-lead-${lead.id}`}>
                          <TableCell className="p-2 sm:p-4">
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{lead.contactName}</div>
                              <div className="text-xs text-muted-foreground truncate">{lead.email}</div>
                              <div className="sm:hidden text-xs text-muted-foreground mt-1">{lead.companyName || ""}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell p-2 sm:p-4">
                            <span className="text-sm">{lead.companyName || "-"}</span>
                          </TableCell>
                          <TableCell className="p-2 sm:p-4">
                            {getStatusBadge(lead.status)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell p-2 sm:p-4 capitalize text-sm">{lead.source.replace("-", " ")}</TableCell>
                          <TableCell className="hidden lg:table-cell p-2 sm:p-4 text-sm">{lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : "-"}</TableCell>
                          <TableCell className="hidden xl:table-cell p-2 sm:p-4 text-sm">
                            {lead.lastContactedAt ? format(new Date(lead.lastContactedAt), "MMM d, yyyy") : "Never"}
                          </TableCell>
                          <TableCell className="p-2 sm:p-4">
                            <div className="flex gap-1 sm:gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedLead(lead);
                                      setLeadDialogOpen(true);
                                    }}
                                    aria-label="View lead details"
                                    data-testid={`button-view-lead-${lead.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteLead.mutate(lead.id)}
                                    disabled={deleteLead.isPending}
                                    aria-label="Delete lead"
                                    data-testid={`button-delete-lead-${lead.id}`}
                                  >
                                    {deleteLead.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Lead</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
            {Object.entries(pipeline).map(([status, statusLeads]) => {
              const config = statusConfig[status];
              const Icon = config?.icon || FileText;
              return (
                <Card key={status}>
                  <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                    <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${config?.color || 'text-muted-foreground'}`} />
                      <span className="truncate">{config?.label || status}</span>
                      <Badge variant="outline" className="ml-auto shrink-0 text-xs">{statusLeads.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0 space-y-2 sm:space-y-3">
                    {statusLeads.map((lead) => (
                      <Card
                        key={lead.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => {
                          setSelectedLead(lead);
                          setLeadDialogOpen(true);
                        }}
                        data-testid={`card-lead-${lead.id}`}
                      >
                        <CardContent className="p-2 sm:p-3">
                          <div className="font-medium text-xs sm:text-sm mb-1 truncate">{lead.contactName}</div>
                          <div className="text-xs text-muted-foreground mb-1 sm:mb-2 truncate">{lead.companyName || "No company"}</div>
                          {lead.estimatedValue && (
                            <div className="text-xs font-medium text-primary flex items-center gap-1">
                              <DollarSign className="h-3 w-3 shrink-0" />
                              ${lead.estimatedValue.toLocaleString()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {statusLeads.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 sm:py-8">
                        <Target className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground text-center">No leads</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="reports">
          {reportsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-48 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : reportsError ? (
            <ErrorState
              title="Failed to load sales reports"
              message="Unable to fetch sales analytics data. Please check your connection and try again."
              onRetry={() => refetchReports()}
              testId="error-sales-reports"
              fullPage
            />
          ) : reportsData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Won Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      ${reportsData.summary.totalWonRevenue.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">{reportsData.summary.wonDeals} deals closed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Pipeline Value</CardTitle>
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 shrink-0" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">
                      ${reportsData.summary.totalPipelineValue.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">{reportsData.summary.activeLeads} active leads</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Win Rate</CardTitle>
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 shrink-0" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-xl sm:text-2xl font-bold">{reportsData.summary.winRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {reportsData.summary.lostDeals} deals lost
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-3 sm:p-6 pb-2">
                    <CardTitle className="text-xs sm:text-sm font-medium">Avg Deal Size</CardTitle>
                    <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 shrink-0" />
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="text-xl sm:text-2xl font-bold">
                      ${reportsData.summary.avgDealSize.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">Weighted: ${reportsData.summary.weightedPipeline.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Pipeline Funnel */}
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <CardTitle className="text-base sm:text-lg">Pipeline by Stage</CardTitle>
                    </div>
                    <CardDescription className="text-xs sm:text-sm">Lead count and value by funnel stage</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportsData.pipelineStages} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                          <YAxis dataKey="stage" type="category" width={80} tick={{ fontSize: 12 }} />
                          <RechartsTooltip
                            formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
                          />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Lead Source Performance */}
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <CardTitle className="text-base sm:text-lg">Lead Sources</CardTitle>
                    </div>
                    <CardDescription className="text-xs sm:text-sm">Conversion rate by lead source</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reportsData.sourceAnalysis}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="source" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                          <YAxis tickFormatter={(v) => `${v}%`} />
                          <RechartsTooltip
                            formatter={(value: number, name: string) => [
                              name === "conversionRate" ? `${value}%` : value,
                              name === "conversionRate" ? "Conversion Rate" : name,
                            ]}
                          />
                          <Bar dataKey="conversionRate" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Conversion Rate" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Weekly Trends */}
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <CardTitle className="text-base sm:text-lg">Weekly Trends</CardTitle>
                    </div>
                    <CardDescription className="text-xs sm:text-sm">New leads and won deals over time</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={reportsData.trends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="newLeads"
                            stackId="1"
                            stroke="hsl(var(--chart-1))"
                            fill="hsl(var(--chart-1))"
                            fillOpacity={0.6}
                            name="New Leads"
                          />
                          <Area
                            type="monotone"
                            dataKey="wonDeals"
                            stackId="2"
                            stroke="hsl(var(--chart-2))"
                            fill="hsl(var(--chart-2))"
                            fillOpacity={0.6}
                            name="Won Deals"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Industry Breakdown */}
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <CardTitle className="text-base sm:text-lg">Industry Breakdown</CardTitle>
                    </div>
                    <CardDescription className="text-xs sm:text-sm">Lead distribution by industry</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={reportsData.industryBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="hsl(var(--primary))"
                            dataKey="count"
                            nameKey="industry"
                            label={({ industry, percent }) => `${industry}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {reportsData.industryBreakdown.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: number, name: string) => [value, "Leads"]}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Deals and Recent Wins */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Opportunities */}
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <CardTitle className="text-base sm:text-lg">Top Opportunities</CardTitle>
                    </div>
                    <CardDescription className="text-xs sm:text-sm">Highest value active deals</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    {reportsData.topDeals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Target className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No active opportunities</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reportsData.topDeals.map((deal, idx) => (
                          <div
                            key={deal.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            data-testid={`row-top-deal-${deal.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{deal.company}</p>
                                <p className="text-xs text-muted-foreground">{deal.contact}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm text-green-600">${deal.value.toLocaleString()}</p>
                              <Badge variant="outline" className="text-xs capitalize">
                                {deal.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Wins */}
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                      <CardTitle className="text-base sm:text-lg">Recent Wins</CardTitle>
                    </div>
                    <CardDescription className="text-xs sm:text-sm">Recently closed deals</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    {reportsData.recentWins.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Trophy className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No closed deals yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reportsData.recentWins.map((deal) => (
                          <div
                            key={deal.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/20"
                            data-testid={`row-recent-win-${deal.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <div>
                                <p className="font-medium text-sm">{deal.company}</p>
                                <p className="text-xs text-muted-foreground">{deal.contact}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm text-green-600">${deal.value.toLocaleString()}</p>
                              {deal.closedAt && (
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(deal.closedAt), "MMM d")}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium mb-2">No report data available</p>
              <p className="text-sm text-muted-foreground">Start adding leads to see your sales analytics</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Lead Detail Dialog */}
      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Lead Details
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">View and manage lead information</DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Contact Name</Label>
                  <p className="font-medium text-sm sm:text-base">{selectedLead.contactName}</p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Email</Label>
                  <p className="font-medium text-sm sm:text-base break-all">{selectedLead.email}</p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Phone</Label>
                  <p className="font-medium text-sm sm:text-base">{selectedLead.phone || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Company</Label>
                  <p className="font-medium text-sm sm:text-base">{selectedLead.companyName || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Job Title</Label>
                  <p className="font-medium text-sm sm:text-base">{selectedLead.jobTitle || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm">Source</Label>
                  <p className="font-medium text-sm sm:text-base capitalize">{selectedLead.source.replace("-", " ")}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="lead-status">Status</Label>
                <Select
                  value={selectedLead.status}
                  onValueChange={(value) =>
                    updateLead.mutate({
                      id: selectedLead.id,
                      data: { status: value, lastContactedAt: new Date() },
                    })
                  }
                  disabled={updateLead.isPending}
                >
                  <SelectTrigger id="lead-status" data-testid="select-lead-status">
                    {updateLead.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedLead.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedLead.notes}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0" />
                    Activities
                  </h3>
                  <Button
                    size="sm"
                    className="text-xs sm:text-sm shrink-0"
                    onClick={() => setActivityDialogOpen(true)}
                    data-testid="button-add-activity"
                  >
                    <Plus className="h-4 w-4 sm:mr-2 shrink-0" />
                    <span className="hidden sm:inline">Log Activity</span>
                  </Button>
                </div>
                <div className="space-y-3">
                  {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground text-center">No activities yet</p>
                    </div>
                  ) : (
                    activities.map((activity) => (
                      <Card key={activity.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            {activity.activityType === "call" && <Phone className="h-4 w-4 mt-1 text-muted-foreground" />}
                            {activity.activityType === "email" && <Mail className="h-4 w-4 mt-1 text-muted-foreground" />}
                            {activity.activityType === "meeting" && <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />}
                            {activity.activityType === "note" && <FileText className="h-4 w-4 mt-1 text-muted-foreground" />}
                            <div className="flex-1">
                              <div className="font-medium text-sm">{activity.subject}</div>
                              {activity.description && (
                                <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(activity.createdAt), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              Log Activity
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Record a sales activity for this lead</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createActivity.mutate({
                leadId: selectedLead?.id,
                userId: "", // Will be set by backend from session
                activityType: formData.get("activityType"),
                subject: formData.get("subject"),
                description: formData.get("description"),
                outcome: formData.get("outcome"),
              });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="activityType">Activity Type</Label>
              <Select name="activityType" defaultValue="call" required>
                <SelectTrigger data-testid="select-activity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Call
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="meeting">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Meeting
                    </div>
                  </SelectItem>
                  <SelectItem value="demo">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Demo
                    </div>
                  </SelectItem>
                  <SelectItem value="proposal">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Proposal
                    </div>
                  </SelectItem>
                  <SelectItem value="note">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Note
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" required data-testid="input-activity-subject" />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} data-testid="textarea-activity-description" />
            </div>

            <div>
              <Label htmlFor="outcome">Outcome</Label>
              <Select name="outcome">
                <SelectTrigger data-testid="select-activity-outcome">
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="successful">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Successful
                    </div>
                  </SelectItem>
                  <SelectItem value="unsuccessful">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Unsuccessful
                    </div>
                  </SelectItem>
                  <SelectItem value="follow-up-needed">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      Follow-up Needed
                    </div>
                  </SelectItem>
                  <SelectItem value="no-answer">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      No Answer
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                className="text-xs sm:text-sm"
                onClick={() => setActivityDialogOpen(false)}
                data-testid="button-cancel-activity"
              >
                <X className="h-4 w-4 sm:mr-2 shrink-0" />
                <span className="hidden sm:inline">Cancel</span>
              </Button>
              <Button type="submit" size="sm" className="text-xs sm:text-sm" disabled={createActivity.isPending} data-testid="button-submit-activity">
                {createActivity.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 sm:mr-2 animate-spin shrink-0" />
                    <span className="hidden sm:inline">Logging...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 sm:mr-2 shrink-0" />
                    <span className="hidden sm:inline">Log Activity</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
