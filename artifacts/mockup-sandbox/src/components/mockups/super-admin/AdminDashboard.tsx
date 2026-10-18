
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  UserMinus,
  Activity,
  BarChart2,
  ArrowUpRight,
  Building2,
  Shield,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MRR_DATA = [12400, 14200, 15800, 16500, 18200, 20100, 21800, 23400, 25100, 26800, 28300, 30200];
const SIGNUP_DATA = [34, 41, 47, 52, 61, 68, 74, 83, 88, 95, 102, 111];
const CHURN_DATA = [3, 4, 3, 5, 4, 3, 4, 3, 4, 3, 3, 4];

function SparkLine({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 140;
  const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
  });
  const fill = pts.map((p, i) => {
    if (i === 0) return `M ${p}`;
    return `L ${p}`;
  }).join(" ");
  const area = `${fill} L ${w},${h} L 0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle
        cx={(data.length - 1) / (data.length - 1) * w}
        cy={h - ((data[data.length - 1] - min) / range) * (h - 6) - 3}
        r="3"
        fill={color}
      />
    </svg>
  );
}

function BarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const h = 80;
  const barW = 8;
  const gap = 6;
  const w = data.length * (barW + gap) - gap;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {data.map((v, i) => {
        const barH = (v / max) * (h - 6);
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={h - barH}
            width={barW}
            height={barH}
            rx={2}
            fill={color}
            opacity={i === data.length - 1 ? 1 : 0.5}
          />
        );
      })}
    </svg>
  );
}

const KPI_CARDS = [
  {
    label: "Monthly Recurring Revenue",
    value: "$30,200",
    change: "+6.7%",
    positive: true,
    sub: "vs last month",
    color: "#6366f1",
    data: MRR_DATA,
    icon: DollarSign,
  },
  {
    label: "New Signups",
    value: "111",
    change: "+8.8%",
    positive: true,
    sub: "this month",
    color: "#10b981",
    data: SIGNUP_DATA,
    icon: Users,
  },
  {
    label: "Churn Rate",
    value: "3.6%",
    change: "-0.3%",
    positive: true,
    sub: "annualized",
    color: "#f59e0b",
    data: CHURN_DATA,
    icon: UserMinus,
  },
  {
    label: "Active Organizations",
    value: "847",
    change: "+12",
    positive: true,
    sub: "since last month",
    color: "#3b82f6",
    data: [620, 650, 680, 704, 725, 748, 770, 790, 810, 824, 836, 847],
    icon: Building2,
  },
];

const RECENT_SIGNUPS = [
  { org: "Acme Door Systems", plan: "Enterprise", users: 12, date: "Today", status: "active" },
  { org: "Bay Area Hardware", plan: "Professional", users: 5, date: "Today", status: "active" },
  { org: "Capitol Doors LLC", plan: "Starter", users: 2, date: "Yesterday", status: "trial" },
  { org: "Delta Security Group", plan: "Enterprise", users: 28, date: "2 days ago", status: "active" },
  { org: "Eastside Installations", plan: "Professional", users: 7, date: "3 days ago", status: "active" },
];

const PLAN_BREAKDOWN = [
  { plan: "Enterprise", count: 89, mrr: "$17,800", color: "#6366f1" },
  { plan: "Professional", count: 312, mrr: "$9,360", color: "#3b82f6" },
  { plan: "Starter", count: 446, mrr: "$3,040", color: "#10b981" },
];

export function AdminDashboard() {
  const [range, setRange] = useState("30d");

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
            { icon: BarChart2, label: "Analytics", active: true },
            { icon: Building2, label: "Organizations" },
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
            <h1 className="text-base font-semibold text-white">Marketing Analytics</h1>
            <p className="text-xs text-slate-500">Platform-wide performance overview</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-28 bg-slate-800 border-slate-700 text-slate-300 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 text-xs">
              Export Report
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            {KPI_CARDS.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label} className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {kpi.positive ? (
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-400" />
                        )}
                        <span className={`text-xs font-medium ${kpi.positive ? "text-emerald-400" : "text-red-400"}`}>
                          {kpi.change}
                        </span>
                        <span className="text-xs text-slate-600">{kpi.sub}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <SparkLine data={kpi.data} color={kpi.color} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Middle row */}
          <div className="grid grid-cols-3 gap-4">
            {/* MRR chart */}
            <Card className="col-span-2 bg-slate-900 border-slate-800">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    MRR Growth (12 months)
                  </CardTitle>
                  <Badge className="bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 text-xs">
                    +143% YoY
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex items-end gap-1 mt-2">
                  {MRR_DATA.map((v, i) => {
                    const max = Math.max(...MRR_DATA);
                    const pct = (v / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t-sm bg-indigo-600/80 transition-all" style={{ height: `${pct * 0.9}px` }} />
                        <span className="text-[9px] text-slate-600">{MONTHS[i]}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500">Current MRR</p>
                    <p className="text-lg font-bold text-white">$30,200</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">ARR</p>
                    <p className="text-lg font-bold text-white">$362,400</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Avg Rev/Org</p>
                    <p className="text-lg font-bold text-white">$35.66</p>
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
                {PLAN_BREAKDOWN.map((p) => {
                  const total = PLAN_BREAKDOWN.reduce((a, b) => a + b.count, 0);
                  const pct = Math.round((p.count / total) * 100);
                  return (
                    <div key={p.plan}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="text-xs text-slate-400">{p.plan}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{p.count} orgs</span>
                          <span className="text-xs font-medium text-white">{p.mrr}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t border-slate-800 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Trial Conversions (30d)</span>
                    <span className="text-xs font-semibold text-emerald-400">68.4%</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">Avg Trial Length</span>
                    <span className="text-xs font-medium text-slate-300">11.2 days</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">Net Promoter Score</span>
                    <span className="text-xs font-semibold text-indigo-400">+64</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Recent signups */}
            <Card className="col-span-2 bg-slate-900 border-slate-800">
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-300">Recent Signups</CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs text-indigo-400 h-7">
                    View All <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800">
                      <th className="text-left py-2 font-medium">Organization</th>
                      <th className="text-left py-2 font-medium">Plan</th>
                      <th className="text-left py-2 font-medium">Users</th>
                      <th className="text-left py-2 font-medium">Joined</th>
                      <th className="text-right py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RECENT_SIGNUPS.map((row) => (
                      <tr key={row.org} className="border-b border-slate-800/50 last:border-0">
                        <td className="py-2.5 text-slate-200 font-medium">{row.org}</td>
                        <td className="py-2.5 text-slate-400">{row.plan}</td>
                        <td className="py-2.5 text-slate-400">{row.users}</td>
                        <td className="py-2.5 text-slate-500">{row.date}</td>
                        <td className="py-2.5 text-right">
                          <Badge
                            className={`text-[10px] ${
                              row.status === "active"
                                ? "bg-emerald-900/40 text-emerald-400 border-emerald-800/50"
                                : "bg-amber-900/40 text-amber-400 border-amber-800/50"
                            } border`}
                          >
                            {row.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Monthly signups bar */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-slate-300">Signups per Month</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <p className="text-2xl font-bold text-white mb-1">111</p>
                <p className="text-xs text-emerald-400 mb-4 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +8.8% vs last month
                </p>
                <div className="flex items-end gap-1">
                  {SIGNUP_DATA.map((v, i) => {
                    const max = Math.max(...SIGNUP_DATA);
                    const pct = (v / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-sm transition-all"
                          style={{
                            height: `${pct * 0.7}px`,
                            backgroundColor: i === SIGNUP_DATA.length - 1 ? "#10b981" : "#10b98140",
                          }}
                        />
                        <span className="text-[8px] text-slate-700">{MONTHS[i].charAt(0)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Organic</span>
                    <span className="text-xs font-medium text-slate-300">63%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Referral</span>
                    <span className="text-xs font-medium text-slate-300">22%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Paid</span>
                    <span className="text-xs font-medium text-slate-300">15%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
