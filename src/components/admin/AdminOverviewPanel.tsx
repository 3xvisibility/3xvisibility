import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Users, Rocket, FileText, Globe, TrendingUp, Zap } from "lucide-react";

interface OverviewData {
  total_users: number;
  total_campaigns: number;
  active_campaigns: number;
  completed_campaigns: number;
  total_pages: number;
  published_pages: number;
  failed_pages: number;
  total_websites: number;
}

interface UserLite {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  pages_used: number;
  created_at: string;
}

interface CampaignLite {
  id: string;
  status: string;
  created_at: string;
}

interface SubscriptionLite {
  user_id: string;
  plan: string;
  pages_used: number;
  pages_limit: number;
}

interface Props {
  loading: boolean;
  overview?: OverviewData;
  users: UserLite[];
  campaigns: CampaignLite[];
  subscriptions: SubscriptionLite[];
}

const PLAN_COLORS: Record<string, string> = {
  free: "hsl(var(--muted-foreground))",
  starter: "hsl(var(--primary))",
  pro: "hsl(var(--success))",
  agency: "hsl(var(--accent-foreground))",
};

const CHART_FALLBACK = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
];

function MiniStat({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: number | string;
  icon: typeof Users;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground truncate">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminOverviewPanel({ loading, overview, users, campaigns, subscriptions }: Props) {
  const planData = useMemo(() => {
    const counts = new Map<string, number>();
    (subscriptions.length ? subscriptions : users).forEach((row: any) => {
      const plan = (row.plan || "free").toLowerCase();
      counts.set(plan, (counts.get(plan) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [subscriptions, users]);

  const campaignStatusData = useMemo(() => {
    const counts = new Map<string, number>();
    campaigns.forEach((c) => {
      const s = (c.status || "unknown").toLowerCase();
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
  }, [campaigns]);

  const signupTrend = useMemo(() => {
    const months: { key: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString("en", { month: "short" }),
        count: 0,
      });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    users.forEach((u) => {
      if (!u.created_at) return;
      const d = new Date(u.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(key);
      if (i !== undefined) months[i].count += 1;
    });
    return months;
  }, [users]);

  const topUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => (b.pages_used || 0) - (a.pages_used || 0))
      .slice(0, 6)
      .map((u) => ({
        name: u.full_name || u.email?.split("@")[0] || "—",
        pages: u.pages_used || 0,
      }));
  }, [users]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const publishRate =
    overview && overview.total_pages > 0
      ? Math.round((overview.published_pages / overview.total_pages) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat title="Total users" value={overview?.total_users ?? users.length} icon={Users} />
        <MiniStat
          title="Campaigns"
          value={overview?.total_campaigns ?? campaigns.length}
          icon={Rocket}
          hint={`${overview?.active_campaigns ?? 0} active`}
        />
        <MiniStat
          title="Pages"
          value={overview?.total_pages ?? 0}
          icon={FileText}
          hint={`${publishRate}% published`}
        />
        <MiniStat title="Websites" value={overview?.total_websites ?? 0} icon={Globe} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Signup trend */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">New users (6 months)</CardTitle>
            </div>
            <CardDescription>Monthly signups across the platform</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="count" name="Signups" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#signupFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan distribution */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Plan distribution</CardTitle>
            </div>
            <CardDescription>Users grouped by subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {planData.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {planData.map((entry, i) => (
                      <Cell key={entry.name} fill={PLAN_COLORS[entry.name] || CHART_FALLBACK[i % CHART_FALLBACK.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                      textTransform: "capitalize",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, textTransform: "capitalize" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Campaign status */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Campaigns by status</CardTitle>
            </div>
            <CardDescription>Current pipeline distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {campaignStatusData.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">No campaigns</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignStatusData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                      textTransform: "capitalize",
                    }}
                  />
                  <Bar dataKey="count" name="Campaigns" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top users by pages */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Top users by pages</CardTitle>
            </div>
            <CardDescription>Highest page generation usage</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {topUsers.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topUsers} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="pages" name="Pages" radius={[0, 6, 6, 0]} fill="hsl(var(--success))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
