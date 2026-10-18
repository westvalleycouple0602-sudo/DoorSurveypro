
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Search,
  MoreHorizontal,
  ChevronDown,
  Users,
  ShieldCheck,
  LogOut,
  BarChart2,
  DollarSign,
  Activity,
  Shield,
  Bell,
  Settings,
  Eye,
  Ban,
  Mail,
  RefreshCw,
  Download,
  Plus,
  ArrowUpRight,
} from "lucide-react";

const ORGS = [
  {
    id: 1,
    name: "Acme Door Systems",
    slug: "acme-door",
    plan: "Enterprise",
    users: 12,
    status: "active",
    mrr: "$398",
    joined: "Jan 12, 2024",
    lastActive: "2 min ago",
    owner: "james@acmedoor.com",
    projects: 48,
  },
  {
    id: 2,
    name: "Bay Area Hardware",
    slug: "bay-hardware",
    plan: "Professional",
    users: 5,
    status: "active",
    mrr: "$149",
    joined: "Mar 3, 2024",
    lastActive: "1 hour ago",
    owner: "sarah@bayareahw.com",
    projects: 21,
  },
  {
    id: 3,
    name: "Capitol Doors LLC",
    slug: "capitol-doors",
    plan: "Starter",
    users: 2,
    status: "trial",
    mrr: "$0",
    joined: "Apr 25, 2026",
    lastActive: "3 hours ago",
    owner: "mike@capitoldoors.com",
    projects: 3,
  },
  {
    id: 4,
    name: "Delta Security Group",
    slug: "delta-security",
    plan: "Enterprise",
    users: 28,
    status: "active",
    mrr: "$798",
    joined: "Nov 8, 2023",
    lastActive: "5 min ago",
    owner: "ceo@deltasecurity.com",
    projects: 112,
  },
  {
    id: 5,
    name: "Eastside Installations",
    slug: "eastside",
    plan: "Professional",
    users: 7,
    status: "active",
    mrr: "$149",
    joined: "Feb 20, 2024",
    lastActive: "Yesterday",
    owner: "ops@eastsideinstall.com",
    projects: 34,
  },
  {
    id: 6,
    name: "Frontier Door Co.",
    slug: "frontier-door",
    plan: "Starter",
    users: 1,
    status: "suspended",
    mrr: "$29",
    joined: "Sep 14, 2024",
    lastActive: "14 days ago",
    owner: "admin@frontierdoor.com",
    projects: 8,
  },
  {
    id: 7,
    name: "Gateway Construction",
    slug: "gateway-const",
    plan: "Enterprise",
    users: 41,
    status: "active",
    mrr: "$1,199",
    joined: "Jul 1, 2023",
    lastActive: "Just now",
    owner: "it@gatewayconstruction.com",
    projects: 203,
  },
  {
    id: 8,
    name: "Harbor View Doors",
    slug: "harbor-view",
    plan: "Professional",
    users: 9,
    status: "active",
    mrr: "$149",
    joined: "Apr 10, 2025",
    lastActive: "4 hours ago",
    owner: "mgr@harborviewdoors.com",
    projects: 29,
  },
];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-900/40 text-emerald-400 border-emerald-800/50",
  trial: "bg-amber-900/40 text-amber-400 border-amber-800/50",
  suspended: "bg-red-900/40 text-red-400 border-red-800/50",
};

const PLAN_STYLES: Record<string, string> = {
  Enterprise: "bg-indigo-900/40 text-indigo-300 border-indigo-800/50",
  Professional: "bg-blue-900/40 text-blue-300 border-blue-800/50",
  Starter: "bg-slate-800 text-slate-400 border-slate-700",
};

export function AdminAccounts() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrg, setSelectedOrg] = useState<number | null>(null);

  const filtered = ORGS.filter((o) => {
    const matchSearch =
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.owner.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === "all" || o.plan === planFilter;
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchPlan && matchStatus;
  });

  const detail = selectedOrg ? ORGS.find((o) => o.id === selectedOrg) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
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
          {[
            { icon: BarChart2, label: "Analytics" },
            { icon: Building2, label: "Organizations", active: true },
            { icon: Users, label: "All Users" },
            { icon: DollarSign, label: "Revenue" },
            { icon: Activity, label: "System Health" },
            { icon: Shield, label: "Security Logs" },
            { icon: Bell, label: "Notifications" },
            { icon: Settings, label: "Settings" },
          ].map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-indigo-600/20 text-indigo-300 font-medium"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-base font-semibold text-white">Account Management</h1>
            <p className="text-xs text-slate-500">847 organizations across all plans</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-slate-400 text-xs h-8">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Org
            </Button>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* List panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Filters */}
            <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  placeholder="Search organizations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 h-8 text-xs"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-slate-300 text-xs h-8">
                  <SelectValue placeholder="All plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All plans</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                  <SelectItem value="Starter">Starter</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-slate-300 text-xs h-8">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-slate-500 ml-auto">{filtered.length} results</span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
              <table className="w-full text-xs mt-4">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left py-2 font-medium">
                      <span className="flex items-center gap-1">
                        Organization <ChevronDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="text-left py-2 font-medium">Plan</th>
                    <th className="text-left py-2 font-medium">Status</th>
                    <th className="text-left py-2 font-medium">Users</th>
                    <th className="text-left py-2 font-medium">Projects</th>
                    <th className="text-left py-2 font-medium">MRR</th>
                    <th className="text-left py-2 font-medium">Last Active</th>
                    <th className="text-left py-2 font-medium">Joined</th>
                    <th className="text-right py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((org) => (
                    <tr
                      key={org.id}
                      onClick={() => setSelectedOrg(org.id === selectedOrg ? null : org.id)}
                      className={`border-b border-slate-800/50 last:border-0 cursor-pointer transition-colors ${
                        selectedOrg === org.id
                          ? "bg-indigo-600/10"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-slate-200">{org.name}</p>
                          <p className="text-slate-600 text-[10px]">{org.owner}</p>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge className={`text-[10px] border ${PLAN_STYLES[org.plan]}`}>
                          {org.plan}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge className={`text-[10px] border ${STATUS_STYLES[org.status]}`}>
                          {org.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-slate-400">{org.users}</td>
                      <td className="py-3 text-slate-400">{org.projects}</td>
                      <td className="py-3 font-medium text-slate-300">{org.mrr}</td>
                      <td className="py-3 text-slate-500">{org.lastActive}</td>
                      <td className="py-3 text-slate-500">{org.joined}</td>
                      <td className="py-3 text-right">
                        <button className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail panel */}
          {detail && (
            <aside className="w-64 shrink-0 border-l border-slate-800 overflow-auto">
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-white">Organization Detail</p>
                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="text-slate-500 hover:text-slate-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center mb-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="font-semibold text-sm text-white">{detail.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{detail.slug}.doorsurvey.pro</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`text-[10px] border ${PLAN_STYLES[detail.plan]}`}>{detail.plan}</Badge>
                  <Badge className={`text-[10px] border ${STATUS_STYLES[detail.status]}`}>{detail.status}</Badge>
                </div>
              </div>

              <div className="p-4 space-y-3 border-b border-slate-800">
                {[
                  ["Owner", detail.owner],
                  ["Users", `${detail.users} members`],
                  ["Projects", `${detail.projects} total`],
                  ["MRR", detail.mrr],
                  ["Last Active", detail.lastActive],
                  ["Joined", detail.joined],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{k}</p>
                    <p className="text-xs text-slate-200 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 space-y-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Quick Actions</p>
                <Button variant="ghost" size="sm" className="w-full justify-start text-slate-400 text-xs h-8 gap-2">
                  <Eye className="w-3.5 h-3.5" /> View as Org Admin
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-slate-400 text-xs h-8 gap-2">
                  <Mail className="w-3.5 h-3.5" /> Email Owner
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-slate-400 text-xs h-8 gap-2">
                  <RefreshCw className="w-3.5 h-3.5" /> Reset Password
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start text-slate-400 text-xs h-8 gap-2">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Change Plan
                </Button>
                <div className="pt-2 border-t border-slate-800">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-red-500 text-xs h-8 gap-2 hover:text-red-400">
                    <Ban className="w-3.5 h-3.5" /> Suspend Account
                  </Button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
