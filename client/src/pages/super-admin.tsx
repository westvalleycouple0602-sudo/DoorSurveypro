import { apiRequest as fetch } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
  BarChart2,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  LogOut,
  Settings,
  Activity,
  Shield,
  Search,
  MoreHorizontal,
  ChevronDown,
  RefreshCw,
  Loader2,
  Ban,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "dashboard" | "accounts";

interface Stats {
  totalOrgs: number;
  totalUsers: number;
  totalProjects: number;
  newOrgsThisMonth: number;
  newUsersThisMonth: number;
  orgGrowthPct: number;
  monthlySignups: Array<{ month: string; month_num: number; year: number; count: number }>;
  planBreakdown: Array<{ plan: string; count: number }>;
}

interface OrgRow {
  id: number;
  name: string;
  slug: string;
  plan: string;
  status: string;
  created_at: string;
  user_count: number;
  project_count: number;
  last_active: string | null;
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [inlineError, setInlineError] = useState("");

  const loginMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/super-admin/login", { username, password }),
    onSuccess: () => {
      setInlineError("");
      onSuccess();
    },
    onError: (err: any) => {
      setInlineError(err.message ?? "Invalid credentials. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError("");
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-600/30">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white tracking-tight">DoorSurvey Pro</h1>
          <p className="text-slate-400 text-sm mt-1">Super Admin Portal</p>
          <Badge className="mt-2 bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 text-xs no-default-active-elevate">
            Internal Access Only
          </Badge>
        </div>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur shadow-2xl shadow-black/40">
          <CardHeader className="pb-4 pt-6 px-6">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-medium text-slate-300">Sign in to continue</p>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sa-username" className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                  Username
                </Label>
                <Input
                  id="sa-username"
                  data-testid="input-sa-username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setInlineError(""); }}
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sa-password" className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="sa-password"
                    data-testid="input-sa-password"
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setInlineError(""); }}
                    required
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {inlineError && (
                <div className="flex items-center gap-2 text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-xs">{inlineError}</span>
                </div>
              )}

              <Button
                type="submit"
                data-testid="button-sa-login"
                className="w-full bg-indigo-600 text-white mt-2"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating…
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800">
              <p className="text-xs text-slate-600 text-center">
                Unauthorized access is strictly prohibited and monitored.
              </p>
              <p className="text-xs text-slate-600 text-center mt-1">
                All sessions are logged and audited.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-600 text-xs mt-6">
          DoorSurvey Pro &copy; {new Date().getFullYear()} — Internal Tools
        </p>
      </div>
    </div>
  );
}

// ─── Shell (sidebar + topbar) ─────────────────────────────────────────────────

function Shell({
  view,
  onViewChange,
  onLogout,
  children,
}: {
  view: View;
  onViewChange: (v: View) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const navItems: { icon: typeof BarChart2; label: string; view: View }[] = [
    { icon: BarChart2, label: "Analytics", view: "dashboard" },
    { icon: Building2, label: "Organizations", view: "accounts" },
  ];
  const disabledItems = [
    { icon: DollarSign, label: "Revenue" },
    { icon: Activity, label: "System Health" },
    { icon: Shield, label: "Security Logs" },
    { icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-56 shrink-0 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white leading-none">DoorSurvey Pro</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Super Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ icon: Icon, label, view: v }) => (
            <button
              key={v}
              data-testid={`nav-${v}`}
              onClick={() => onViewChange(v)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                view === v
                  ? "bg-indigo-600/20 text-indigo-300 font-medium"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-800/60 mt-2">
            {disabledItems.map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-600 cursor-not-allowed"
                disabled
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={onLogout}
            data-testid="button-sa-logout"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</div>
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView() {
  const { data: stats, isLoading, refetch } = useQuery<Stats>({
    queryKey: ["/api/super-admin/stats"],
  });

  const months12 = stats?.monthlySignups ?? [];

  const kpiCards = stats
    ? [
        {
          label: "Total Organizations",
          value: stats.totalOrgs.toLocaleString(),
          sub: `+${stats.newOrgsThisMonth} this month`,
          pct: stats.orgGrowthPct,
          positive: stats.orgGrowthPct >= 0,
          icon: Building2,
          color: "#6366f1",
        },
        {
          label: "Total Users",
          value: stats.totalUsers.toLocaleString(),
          sub: `+${stats.newUsersThisMonth} this month`,
          pct: null,
          positive: true,
          icon: Users,
          color: "#10b981",
        },
        {
          label: "Total Projects",
          value: stats.totalProjects.toLocaleString(),
          sub: "across all orgs",
          pct: null,
          positive: true,
          icon: Activity,
          color: "#3b82f6",
        },
        {
          label: "New Signups",
          value: stats.newOrgsThisMonth.toLocaleString(),
          sub: "organisations this month",
          pct: stats.orgGrowthPct,
          positive: stats.orgGrowthPct >= 0,
          icon: TrendingUp,
          color: "#f59e0b",
        },
      ]
    : [];

  const maxSignups = Math.max(...months12.map((m) => m.count), 1);
  const planColors: Record<string, string> = {
    enterprise: "#6366f1",
    professional: "#3b82f6",
    starter: "#10b981",
    free: "#64748b",
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-white">Marketing Analytics</h1>
          <p className="text-xs text-slate-500">Platform-wide performance overview</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="text-slate-400 h-8"
          data-testid="button-refresh-stats"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-4">
              {kpiCards.map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <Card key={kpi.label} className="bg-slate-900 border-slate-800" data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
                          <p className="text-2xl font-bold text-white">{kpi.value}</p>
                        </div>
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${kpi.color}20` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {kpi.pct !== null ? (
                          kpi.positive ? (
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-400" />
                          )
                        ) : null}
                        {kpi.pct !== null && (
                          <span className={`text-xs font-medium ${kpi.positive ? "text-emerald-400" : "text-red-400"}`}>
                            {kpi.pct > 0 ? "+" : ""}
                            {kpi.pct}%
                          </span>
                        )}
                        <span className="text-xs text-slate-600">{kpi.sub}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {/* Monthly signups chart */}
              <Card className="col-span-2 bg-slate-900 border-slate-800">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Monthly New Organizations (12 months)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  {months12.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-slate-600 text-sm">
                      No data yet
                    </div>
                  ) : (
                    <div className="flex items-end gap-1 mt-2" style={{ height: 80 }}>
                      {months12.map((m, i) => {
                        const pct = (m.count / maxSignups) * 100;
                        const isLast = i === months12.length - 1;
                        return (
                          <div key={`${m.year}-${m.month_num}`} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              title={`${m.month} ${m.year}: ${m.count}`}
                              className="w-full rounded-t-sm"
                              style={{
                                height: `${Math.max(4, pct * 0.72)}px`,
                                backgroundColor: isLast ? "#6366f1" : "#6366f140",
                              }}
                            />
                            <span className="text-[9px] text-slate-600">{m.month.substring(0, 1)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-800">
                    <div>
                      <p className="text-xs text-slate-500">Total Orgs</p>
                      <p className="text-lg font-bold text-white">{stats?.totalOrgs.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">This Month</p>
                      <p className="text-lg font-bold text-white">{stats?.newOrgsThisMonth}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Avg Users/Org</p>
                      <p className="text-lg font-bold text-white">
                        {stats && stats.totalOrgs > 0
                          ? (stats.totalUsers / stats.totalOrgs).toFixed(1)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Avg Projects/Org</p>
                      <p className="text-lg font-bold text-white">
                        {stats && stats.totalOrgs > 0
                          ? (stats.totalProjects / stats.totalOrgs).toFixed(1)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plan breakdown */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-sm font-medium text-slate-300">Plan Distribution</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  {(stats?.planBreakdown ?? []).length === 0 ? (
                    <p className="text-slate-600 text-sm">No plan data yet</p>
                  ) : (
                    stats!.planBreakdown.map((p) => {
                      const total = stats!.planBreakdown.reduce((a, b) => a + b.count, 0);
                      const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
                      const color = planColors[p.plan?.toLowerCase()] ?? "#64748b";
                      return (
                        <div key={p.plan}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-xs text-slate-400 capitalize">{p.plan || "Unknown"}</span>
                            </div>
                            <span className="text-xs font-medium text-white">{p.count} orgs</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-800">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Accounts View ────────────────────────────────────────────────────────────

function AccountsView() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "suspend" | "activate"; orgId: number; orgName: string } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useQuery<{ organizations: OrgRow[]; total: number; page: number; limit: number }>({
    queryKey: ["/api/super-admin/organizations", debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      return fetch(`/api/super-admin/organizations?${params}`).then((r) => r.json());
    },
  });

  const { data: orgUsers } = useQuery<any[]>({
    queryKey: ["/api/super-admin/organizations", selectedOrg?.id, "users"],
    queryFn: () => fetch(`/api/super-admin/organizations/${selectedOrg!.id}/users`).then((r) => r.json()),
    enabled: !!selectedOrg,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/super-admin/organizations/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      if (selectedOrg) {
        setSelectedOrg((prev) => prev ? { ...prev, status: confirmAction?.type === "suspend" ? "suspended" : "active" } : null);
      }
      toast({ title: "Organization status updated" });
      setConfirmAction(null);
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const planMutation = useMutation({
    mutationFn: ({ id, plan }: { id: number; plan: string }) =>
      apiRequest("PATCH", `/api/super-admin/organizations/${id}/plan`, { plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/organizations"] });
      toast({ title: "Plan updated" });
    },
    onError: () => toast({ title: "Failed to update plan", variant: "destructive" }),
  });

  const orgs = (data?.organizations ?? []).filter((o) => {
    const matchPlan = planFilter === "all" || o.plan?.toLowerCase() === planFilter;
    const matchStatus = statusFilter === "all" || o.status?.toLowerCase() === statusFilter;
    return matchPlan && matchStatus;
  });

  const STATUS_BADGE: Record<string, string> = {
    active: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50",
    trialing: "bg-amber-900/40 text-amber-400 border-amber-800/50",
    suspended: "bg-red-900/40 text-red-400 border-red-800/50",
    canceled: "bg-slate-800 text-slate-500 border-slate-700",
  };

  const PLAN_BADGE: Record<string, string> = {
    enterprise: "bg-indigo-900/40 text-indigo-300 border-indigo-800/50",
    professional: "bg-blue-900/40 text-blue-300 border-blue-800/50",
    starter: "bg-slate-800 text-slate-400 border-slate-700",
    free: "bg-slate-800 text-slate-500 border-slate-700",
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 1) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-base font-semibold text-white">Account Management</h1>
            <p className="text-xs text-slate-500">
              {data?.total ?? 0} organizations across all plans
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-slate-400 h-8"
            data-testid="button-refresh-orgs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* Table panel */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Filters */}
            <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-3 shrink-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  data-testid="input-search-orgs"
                  placeholder="Search organizations…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-8 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-xs"
                />
              </div>
              <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-slate-300 text-xs h-8">
                  <SelectValue placeholder="All plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-slate-300 text-xs h-8">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-slate-500 ml-auto">{orgs.length} shown</span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 pb-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                </div>
              ) : (
                <table className="w-full text-xs mt-4">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      {["Organization", "Plan", "Status", "Users", "Projects", "Joined", "Last Active", ""].map((h) => (
                        <th key={h} className="text-left py-2 font-medium pr-4 last:pr-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map((org) => (
                      <tr
                        key={org.id}
                        data-testid={`row-org-${org.id}`}
                        onClick={() => setSelectedOrg(selectedOrg?.id === org.id ? null : org)}
                        className={`border-b border-slate-800/50 last:border-0 cursor-pointer transition-colors ${
                          selectedOrg?.id === org.id ? "bg-indigo-600/10" : "hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium text-slate-200">{org.name}</p>
                          <p className="text-slate-600 text-[10px]">{org.slug}</p>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={`text-[10px] border ${PLAN_BADGE[org.plan?.toLowerCase()] ?? PLAN_BADGE.free}`}>
                            {org.plan ?? "free"}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge className={`text-[10px] border ${STATUS_BADGE[org.status?.toLowerCase()] ?? "bg-slate-800 text-slate-400 border-slate-700"}`}>
                            {org.status ?? "active"}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-slate-400">{org.user_count}</td>
                        <td className="py-3 pr-4 text-slate-400">{org.project_count}</td>
                        <td className="py-3 pr-4 text-slate-500">{formatDate(org.created_at)}</td>
                        <td className="py-3 pr-4 text-slate-500">{org.last_active ? formatDate(org.last_active) : "—"}</td>
                        <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => setSelectedOrg(org)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  planMutation.mutate({ id: org.id, plan: org.plan === "enterprise" ? "professional" : "enterprise" })
                                }
                              >
                                Toggle Plan
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {org.status === "suspended" ? (
                                <DropdownMenuItem
                                  className="text-emerald-500"
                                  onClick={() => setConfirmAction({ type: "activate", orgId: org.id, orgName: org.name })}
                                >
                                  <CheckCircle className="w-3.5 h-3.5 mr-2" /> Activate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-red-500"
                                  onClick={() => setConfirmAction({ type: "suspend", orgId: org.id, orgName: org.name })}
                                >
                                  <Ban className="w-3.5 h-3.5 mr-2" /> Suspend
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                    {orgs.length === 0 && !isLoading && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-600 text-sm">
                          No organizations found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selectedOrg && (
            <aside className="w-64 shrink-0 border-l border-slate-800 overflow-auto flex flex-col">
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-white">Organization Detail</p>
                  <button onClick={() => setSelectedOrg(null)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center mb-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="font-semibold text-sm text-white">{selectedOrg.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedOrg.slug}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={`text-[10px] border ${PLAN_BADGE[selectedOrg.plan?.toLowerCase()] ?? PLAN_BADGE.free}`}>
                    {selectedOrg.plan ?? "free"}
                  </Badge>
                  <Badge className={`text-[10px] border ${STATUS_BADGE[selectedOrg.status?.toLowerCase()] ?? "bg-slate-800 text-slate-400 border-slate-700"}`}>
                    {selectedOrg.status ?? "active"}
                  </Badge>
                </div>
              </div>

              <div className="p-4 space-y-3 border-b border-slate-800">
                {[
                  ["Members", `${selectedOrg.user_count} users`],
                  ["Projects", `${selectedOrg.project_count}`],
                  ["Joined", formatDate(selectedOrg.created_at)],
                  ["Last Active", selectedOrg.last_active ? formatDate(selectedOrg.last_active) : "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{k}</p>
                    <p className="text-xs text-slate-200 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              {/* Change plan */}
              <div className="p-4 border-b border-slate-800">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Change Plan</p>
                <Select
                  value={selectedOrg.plan ?? "free"}
                  onValueChange={(plan) => {
                    planMutation.mutate({ id: selectedOrg.id, plan });
                    setSelectedOrg((prev) => prev ? { ...prev, plan } : null);
                  }}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300 text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Member list */}
              {orgUsers && orgUsers.length > 0 && (
                <div className="p-4 flex-1 overflow-auto">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Members</p>
                  <div className="space-y-2">
                    {orgUsers.map((u) => (
                      <div key={u.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-slate-300 truncate">
                            {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email}
                          </p>
                          <p className="text-[10px] text-slate-600 truncate">{u.email}</p>
                        </div>
                        <Badge className="text-[9px] border bg-slate-800 text-slate-400 border-slate-700 shrink-0 no-default-active-elevate">
                          {u.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-4 border-t border-slate-800">
                {selectedOrg.status === "suspended" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-emerald-500 text-xs h-8 gap-2"
                    onClick={() => setConfirmAction({ type: "activate", orgId: selectedOrg.id, orgName: selectedOrg.name })}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Activate Account
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-500 text-xs h-8 gap-2"
                    onClick={() => setConfirmAction({ type: "suspend", orgId: selectedOrg.id, orgName: selectedOrg.name })}
                  >
                    <Ban className="w-3.5 h-3.5" /> Suspend Account
                  </Button>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "suspend" ? "Suspend Organization?" : "Activate Organization?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "suspend"
                ? `This will suspend "${confirmAction?.orgName}" and set their status to suspended. They will still exist in the system.`
                : `This will reactivate "${confirmAction?.orgName}" and restore their active status.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmAction &&
                statusMutation.mutate({
                  id: confirmAction.orgId,
                  status: confirmAction.type === "suspend" ? "suspended" : "active",
                })
              }
              className={confirmAction?.type === "suspend" ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"}
            >
              {confirmAction?.type === "suspend" ? "Suspend" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const [view, setView] = useState<View>("dashboard");
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/super-admin/me"],
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/super-admin/logout", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/super-admin/me"] }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!me?.authenticated) {
    return (
      <LoginPage
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/super-admin/me"] })}
      />
    );
  }

  return (
    <Shell view={view} onViewChange={setView} onLogout={() => logoutMutation.mutate()}>
      {view === "dashboard" ? <DashboardView /> : <AccountsView />}
    </Shell>
  );
}
