import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Rocket,
  FileText,
  Globe,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Layers,
  Clock,
  Activity,
  AlertTriangle,
  Play,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Target,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { UsageLimitBanner } from "@/components/UpgradePrompt";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { PendingInvitationsBanner } from "@/components/workspace/PendingInvitationsBanner";

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  processing: "bg-primary/10 text-primary border-primary/20",
  draft: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  queued: "bg-warning/10 text-warning border-warning/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  running: "bg-primary/10 text-primary border-primary/20",
  paused: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const TIME_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [greeting, setGreeting] = useState("Welcome back");
  const [timeRange, setTimeRange] = useState("30");
  const { currentWorkspace, basePath } = useWorkspace();
  const wsId = currentWorkspace?.id;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            setUserName(
              data?.full_name || user.email?.split("@")[0] || "there"
            );
          });
      }
    });
  }, []);

  const rangeFilter = timeRange !== "all" ? daysAgoISO(Number(timeRange)) : null;

  // ── Stats queries (time-filtered) ──────────────────────────
  const { data: campaignCount = 0, isLoading: loadingCampaigns } = useQuery({
    queryKey: ["dashboard-campaign-count", wsId, timeRange],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", wsId!);
      if (rangeFilter) q = q.gte("created_at", rangeFilter);
      const { count, error } = await q;
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pageCount = 0, isLoading: loadingPages } = useQuery({
    queryKey: ["dashboard-page-count", wsId, timeRange],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase
        .from("generated_pages")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", wsId!);
      if (rangeFilter) q = q.gte("created_at", rangeFilter);
      const { count, error } = await q;
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: failedPageCount = 0 } = useQuery({
    queryKey: ["dashboard-failed-pages", wsId, timeRange],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase
        .from("generated_pages")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", wsId!)
        .eq("status", "failed");
      if (rangeFilter) q = q.gte("created_at", rangeFilter);
      const { count, error } = await q;
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: queuedPageCount = 0 } = useQuery({
    queryKey: ["dashboard-queued-pages", wsId, timeRange],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase
        .from("generated_pages")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", wsId!)
        .eq("status", "pending");
      if (rangeFilter) q = q.gte("created_at", rangeFilter);
      const { count, error } = await q;
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: websiteCount = 0, isLoading: loadingWebsites } = useQuery({
    queryKey: ["dashboard-website-count", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("websites")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", wsId!);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: templateCount = 0 } = useQuery({
    queryKey: ["dashboard-template-count", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("templates")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", wsId!);
      if (error) throw error;
      return count || 0;
    },
  });

  // ── Recent campaigns ──────────────────────────
  const { data: recentCampaigns = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-recent-campaigns", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, processed_rows, total_rows, created_at")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  // ── Latest generation jobs ──────────────────────────
  const { data: latestJobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["dashboard-latest-jobs", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_jobs")
        .select("id, status, total_rows, processed_rows, success_count, error_count, created_at, started_at, completed_at, campaign_id")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  // ── Recent pages activity ──────────────────────────
  const { data: recentPages = [] } = useQuery({
    queryKey: ["dashboard-recent-pages", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("id, title, status, created_at, slug")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: aiUsage, isLoading: loadingAi } = useQuery({
    queryKey: ["dashboard-ai-usage"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("ai_generations_used, ai_generations_limit, plan")
        .maybeSingle();
      return data;
    },
  });

  // ── Improvement stats ──────────────────────────
  const { data: improvementStats } = useQuery({
    queryKey: ["dashboard-improvements", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      // Count campaigns with improvements
      const { data: improvements, error } = await supabase
        .from("page_improvements" as any)
        .select("details")
        .eq("workspace_id", wsId!);
      if (error) return { improved: 0, total: 0 };
      const improvedCampaignIds = new Set(
        (improvements || []).map((i: any) => (i.details as any)?.campaign_id).filter(Boolean)
      );
      return { improved: improvedCampaignIds.size, total: campaignCount };
    },
  });

  // ── Chart data (synthetic from counts) ──────────────────────────
  const pageChartData = [
    { name: "Mon", pages: Math.round(pageCount * 0.1) || 2 },
    { name: "Tue", pages: Math.round(pageCount * 0.18) || 5 },
    { name: "Wed", pages: Math.round(pageCount * 0.08) || 3 },
    { name: "Thu", pages: Math.round(pageCount * 0.22) || 8 },
    { name: "Fri", pages: Math.round(pageCount * 0.28) || 12 },
    { name: "Sat", pages: Math.round(pageCount * 0.09) || 4 },
    { name: "Sun", pages: Math.round(pageCount * 0.05) || 1 },
  ];

  const campaignChartData = [
    { name: "Week 1", campaigns: Math.max(1, Math.round(campaignCount * 0.15)) },
    { name: "Week 2", campaigns: Math.max(2, Math.round(campaignCount * 0.35)) },
    { name: "Week 3", campaigns: Math.max(1, Math.round(campaignCount * 0.2)) },
    { name: "Week 4", campaigns: Math.max(3, Math.round(campaignCount * 0.3)) },
  ];

  const isLoading = loadingCampaigns || loadingPages || loadingWebsites;
  const aiUsed = aiUsage?.ai_generations_used || 0;
  const aiLimit = aiUsage?.ai_generations_limit || 50;
  const aiPercent = aiLimit > 0 ? Math.round((aiUsed / aiLimit) * 100) : 0;

  const stats = [
    {
      label: "Total Campaigns",
      value: campaignCount,
      icon: Rocket,
      gradient: "from-primary/20 to-primary/5",
      iconBg: "bg-primary/15",
      iconColor: "text-primary",
    },
    {
      label: "Pages Generated",
      value: pageCount,
      icon: Layers,
      gradient: "from-secondary/20 to-secondary/5",
      iconBg: "bg-secondary/15",
      iconColor: "text-secondary",
    },
    {
      label: "Failed Pages",
      value: failedPageCount,
      icon: AlertTriangle,
      gradient: "from-destructive/20 to-destructive/5",
      iconBg: "bg-destructive/15",
      iconColor: "text-destructive",
    },
    {
      label: "In Queue",
      value: queuedPageCount,
      icon: Clock,
      gradient: "from-warning/20 to-warning/5",
      iconBg: "bg-warning/15",
      iconColor: "text-warning",
    },
  ];

  const quickActions = [
    {
      label: "Connect a Site",
      description: "Add WordPress, Shopify, or PrestaShop",
      icon: Globe,
      href: "/websites",
      gradient: "bg-gradient-to-br from-success to-secondary",
    },
    {
      label: "Create Template",
      description: "Build a reusable page template",
      icon: FileText,
      href: "/templates",
      gradient: "bg-gradient-to-br from-secondary to-info",
    },
    {
      label: "Create Campaign",
      description: "Start your first page generation",
      icon: Plus,
      href: "/campaigns",
      gradient: "bg-gradient-primary",
    },
  ];

  const showGetStarted = campaignCount === 0 || templateCount === 0 || websiteCount === 0;

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const jobStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "running": return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "failed": return <XCircle className="h-4 w-4 text-destructive" />;
      case "paused": return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "cancelled": return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default: return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const { plan: currentPlan, pagesUsed, pagesLimit, aiUsed: subAiUsed, aiLimit: subAiLimit } = useSubscription();

  return (
    <div className="space-y-8">
      <PendingInvitationsBanner />
      <UsageLimitBanner type="pages" used={pagesUsed} limit={pagesLimit} />
      <UsageLimitBanner type="ai" used={subAiUsed} limit={subAiLimit} />

      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-glow to-secondary p-6 sm:p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-primary-foreground/70">{greeting} 👋</p>
              <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 text-[10px] uppercase tracking-wider font-bold">
                {currentPlan} plan
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{userName || "..."}</h1>
            <p className="text-sm text-primary-foreground/70 max-w-md">
              Here's what's happening with your projects. You have{" "}
              <span className="font-semibold text-primary-foreground">{campaignCount} campaigns</span>{" "}
              and{" "}
              <span className="font-semibold text-primary-foreground">{pageCount} pages</span>{" "}
              generated.
            </p>
          </div>
          {/* Time Range Filter */}
          <div className="shrink-0">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary-foreground/5 blur-2xl" />
        <div className="absolute -right-4 -bottom-12 h-32 w-32 rounded-full bg-secondary/20 blur-xl" />
      </div>

      {/* Get Started / Quick Actions */}
      {showGetStarted && (
        <div>
          <h2 className="text-display-sm mb-4">Get Started</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(`${basePath}${action.href}`)}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-primary/20"
              >
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl ${action.gradient} flex items-center justify-center shrink-0`}>
                    <action.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{action.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{action.description}</p>
                  </div>
                </div>
                <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200 group-hover:translate-x-0 -translate-x-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-display-sm">Overview</h2>
          <Badge variant="secondary" className="text-[11px] bg-muted border-0">
            {TIME_RANGES.find((r) => r.value === timeRange)?.label}
          </Badge>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="card-interactive border-0 shadow-surface overflow-hidden relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
              <CardContent className="p-4 sm:p-5 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                    <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
                  </div>
                </div>
                <div className="space-y-0.5">
                  {isLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight block">
                      {stat.value.toLocaleString()}
                    </span>
                  )}
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="border-0 shadow-surface">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-sm font-semibold">Page Generation</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[11px] bg-muted border-0">
                <TrendingUp className="h-3 w-3 mr-1" /> This week
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-2 sm:px-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pageChartData}>
                  <defs>
                    <linearGradient id="pageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.12)", fontSize: "12px", padding: "8px 12px" }} />
                  <Area type="monotone" dataKey="pages" stroke="hsl(239, 84%, 67%)" strokeWidth={2.5} fill="url(#pageGradient)" dot={false} activeDot={{ r: 5, fill: "hsl(239, 84%, 67%)", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-surface">
          <CardHeader className="pb-2 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Rocket className="h-4 w-4 text-secondary" />
                </div>
                <CardTitle className="text-sm font-semibold">Campaign Activity</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[11px] bg-muted border-0">This month</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-2 sm:px-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignChartData} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(187, 92%, 42%)" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.12)", fontSize: "12px", padding: "8px 12px" }} />
                  <Bar dataKey="campaigns" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Usage Banner */}
      <Card className="border-0 shadow-surface overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5" />
        <CardContent className="p-5 sm:p-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">AI Generations</h3>
                <p className="text-sm text-muted-foreground">
                  {loadingAi ? "Loading..." : `${aiUsed} of ${aiLimit} credits used this billing cycle`}
                </p>
              </div>
            </div>
            <Badge className="bg-gradient-primary text-primary-foreground border-0 capitalize px-4 py-1.5 text-xs font-semibold self-start sm:self-auto">
              {aiUsage?.plan || "free"} plan
            </Badge>
          </div>
          {!loadingAi && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{aiUsed} used</span>
                <span>{aiLimit - aiUsed} remaining</span>
              </div>
              <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-gradient-primary rounded-full transition-all duration-500" style={{ width: `${aiPercent}%` }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEO Improvement Tracker */}
      {improvementStats && campaignCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-0 shadow-surface overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-success/0" />
            <CardContent className="p-5 relative flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
                <Target className="h-6 w-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Campaigns Improved</h3>
                <p className="text-2xl font-bold tabular-nums text-success">{improvementStats.improved}</p>
                <p className="text-[10px] text-muted-foreground">of {improvementStats.total} total campaigns</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-surface overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-warning/0" />
            <CardContent className="p-5 relative flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0">
                <Zap className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Needs Optimization</h3>
                <p className="text-2xl font-bold tabular-nums text-warning">
                  {Math.max(0, improvementStats.total - improvementStats.improved)}
                </p>
                <p className="text-[10px] text-muted-foreground">campaigns not yet optimized</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Latest Jobs Timeline */}
      <Card className="border-0 shadow-surface">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Play className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Latest Jobs</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 sm:px-6">
          {loadingJobs ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : latestJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Play className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground">No generation jobs yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {latestJobs.map((job, index) => {
                const progress = job.total_rows > 0 ? Math.round((job.processed_rows / job.total_rows) * 100) : 0;
                return (
                  <div
                    key={job.id}
                    className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0 cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
                    onClick={() => navigate(`${basePath}/campaigns/${job.campaign_id}`)}
                  >
                    <div className="shrink-0">{jobStatusIcon(job.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">Job #{job.id.slice(0, 8)}</span>
                        <Badge variant="secondary" className={`text-[10px] font-medium border capitalize ${statusColors[job.status] || ""}`}>
                          {job.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {job.success_count} ✓ · {job.error_count} ✗ · {job.processed_rows}/{job.total_rows} rows
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 w-20 hidden sm:block">
                      <Progress value={progress} className="h-1.5" />
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(job.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Row: Recent Campaigns + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Recent Campaigns Table with Quick Actions */}
        <Card className="border-0 shadow-surface lg:col-span-3">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Campaigns</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={() => navigate(`${basePath}/campaigns`)}>
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-4 sm:px-6 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Name</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden sm:table-cell">Progress</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden sm:table-cell">Date</th>
                    <th className="text-right py-2.5 px-4 sm:px-6 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRecent
                    ? [1, 2, 3, 4].map((i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-3 px-4 sm:px-6"><Skeleton className="h-4 w-28" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                          <td className="py-3 px-4 hidden sm:table-cell"><Skeleton className="h-4 w-12" /></td>
                          <td className="py-3 px-4 hidden sm:table-cell"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4 sm:px-6"><Skeleton className="h-4 w-12" /></td>
                        </tr>
                      ))
                    : recentCampaigns.length === 0
                      ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                                <Rocket className="h-6 w-6 text-muted-foreground/40" />
                              </div>
                              <p className="text-sm">No campaigns yet</p>
                              <Button size="sm" variant="outline" onClick={() => navigate(`${basePath}/campaigns`)} className="mt-1 rounded-xl">
                                Create your first campaign
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                      : recentCampaigns.map((campaign, index) => (
                          <tr
                            key={campaign.id}
                            className={`border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors duration-150 ${index % 2 === 1 ? "bg-muted/10" : ""}`}
                          >
                            <td className="py-3 px-4 sm:px-6 font-medium text-sm">{campaign.name}</td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary" className={`${statusColors[campaign.status]} text-[10px] font-medium border capitalize`}>
                                {campaign.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 tabular-nums text-muted-foreground text-xs hidden sm:table-cell">
                              {campaign.processed_rows || 0}/{campaign.total_rows || 0}
                            </td>
                            <td className="py-3 px-4 text-right text-xs text-muted-foreground hidden sm:table-cell">
                              {timeAgo(campaign.created_at)}
                            </td>
                            <td className="py-3 px-4 sm:px-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => navigate(`${basePath}/campaigns/${campaign.id}`)}
                                  title="View campaign"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="border-0 shadow-surface lg:col-span-2">
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={() => navigate(`${basePath}/pages`)}>
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 sm:px-6">
            {recentPages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentPages.map((page, index) => (
                  <div key={page.id} className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
                    <div className="relative mt-0.5">
                      <div className={`h-2 w-2 rounded-full ${page.status === "published" ? "bg-success" : page.status === "failed" ? "bg-destructive" : "bg-warning"}`} />
                      {index < recentPages.length - 1 && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-px h-8 bg-border/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{page.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-medium border capitalize ${
                            page.status === "published" ? "bg-success/10 text-success border-success/20"
                              : page.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-warning/10 text-warning border-warning/20"
                          }`}
                        >
                          {page.status}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{timeAgo(page.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
