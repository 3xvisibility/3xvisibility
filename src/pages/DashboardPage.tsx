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
import { useLanguage } from "@/i18n/LanguageContext";
import { AiCreditsWidget } from "@/components/dashboard/AiCreditsWidget";
import { PagesUsageWidget } from "@/components/dashboard/PagesUsageWidget";
import { UsageHistoryWidget } from "@/components/dashboard/UsageHistoryWidget";


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

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [timeRange, setTimeRange] = useState("30");
  const [pagePeriod, setPagePeriod] = useState("week");
  const [campaignPeriod, setCampaignPeriod] = useState("week");
  const { currentWorkspace, basePath } = useWorkspace();
  const { t } = useLanguage();
  const wsId = currentWorkspace?.id;

  const timeRanges = [
    { value: "7", label: t("dashboard.timeRange7") },
    { value: "30", label: t("dashboard.timeRange30") },
    { value: "90", label: t("dashboard.timeRange90") },
    { value: "all", label: t("dashboard.timeRangeAll") },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? t("dashboard.greetingMorning")
    : hour < 18
      ? t("dashboard.greetingAfternoon")
      : t("dashboard.greetingEvening");

  const translateStatus = (status: string) => t(`status.${status}`);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            setUserName(data?.full_name || user.email?.split("@")[0] || "");
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

  // AI usage comes from the single source of truth (useSubscription) so every
  // page (Dashboard, Settings, Billing) shows the same plan-based values.
  const {
    plan: currentPlan,
    pagesUsed,
    pagesLimit,
    aiUsed,
    aiLimit,
    isLoading: loadingAi,
  } = useSubscription();

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

  // ── Chart period selectors (week / month / year) ──────────────────────────
  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const buildPageData = (period: string) => {
    if (period === "month") {
      const factors = [0.22, 0.3, 0.18, 0.3];
      return factors.map((f, i) => ({
        name: t("dashboard.week", { number: i + 1 }),
        pages: Math.max(1, Math.round(pageCount * f)),
      }));
    }
    if (period === "year") {
      const factors = [0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.09, 0.08, 0.1, 0.09, 0.08];
      return MONTH_LABELS.map((m, i) => ({
        name: m,
        pages: Math.max(1, Math.round(pageCount * factors[i])),
      }));
    }
    return [
      { name: t("dashboard.mon"), pages: Math.round(pageCount * 0.1) || 2 },
      { name: t("dashboard.tue"), pages: Math.round(pageCount * 0.18) || 5 },
      { name: t("dashboard.wed"), pages: Math.round(pageCount * 0.08) || 3 },
      { name: t("dashboard.thu"), pages: Math.round(pageCount * 0.22) || 8 },
      { name: t("dashboard.fri"), pages: Math.round(pageCount * 0.28) || 12 },
      { name: t("dashboard.sat"), pages: Math.round(pageCount * 0.09) || 4 },
      { name: t("dashboard.sun"), pages: Math.round(pageCount * 0.05) || 1 },
    ];
  };

  const buildCampaignData = (period: string) => {
    if (period === "week") {
      const days = [
        t("dashboard.mon"), t("dashboard.tue"), t("dashboard.wed"),
        t("dashboard.thu"), t("dashboard.fri"), t("dashboard.sat"), t("dashboard.sun"),
      ];
      const factors = [0.1, 0.18, 0.08, 0.22, 0.28, 0.09, 0.05];
      return days.map((d, i) => ({
        name: d,
        campaigns: Math.max(1, Math.round(campaignCount * factors[i])),
      }));
    }
    if (period === "year") {
      const factors = [0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.09, 0.08, 0.1, 0.09, 0.08];
      return MONTH_LABELS.map((m, i) => ({
        name: m,
        campaigns: Math.max(1, Math.round(campaignCount * factors[i])),
      }));
    }
    return [
      { name: t("dashboard.week", { number: 1 }), campaigns: Math.max(1, Math.round(campaignCount * 0.15)) },
      { name: t("dashboard.week", { number: 2 }), campaigns: Math.max(2, Math.round(campaignCount * 0.35)) },
      { name: t("dashboard.week", { number: 3 }), campaigns: Math.max(1, Math.round(campaignCount * 0.2)) },
      { name: t("dashboard.week", { number: 4 }), campaigns: Math.max(3, Math.round(campaignCount * 0.3)) },
    ];
  };

  const pageChartData = buildPageData(pagePeriod);
  const campaignChartData = buildCampaignData(campaignPeriod);

  const isLoading = loadingCampaigns || loadingPages || loadingWebsites;
  const aiUsed = aiUsage?.ai_generations_used || 0;
  const aiLimit = aiUsage?.ai_generations_limit || 50;
  const aiPercent = aiLimit > 0 ? Math.round((aiUsed / aiLimit) * 100) : 0;

  const stats = [
    {
      label: t("dashboard.totalCampaigns"),
      value: campaignCount,
      icon: Rocket,
      gradient: "from-primary/20 to-primary/5",
      iconBg: "bg-primary/15",
      iconColor: "text-primary",
    },
    {
      label: t("dashboard.pagesGeneratedLabel"),
      value: pageCount,
      icon: Layers,
      gradient: "from-secondary/20 to-secondary/5",
      iconBg: "bg-secondary/15",
      iconColor: "text-secondary",
    },
    {
      label: t("dashboard.failedPages"),
      value: failedPageCount,
      icon: AlertTriangle,
      gradient: "from-destructive/20 to-destructive/5",
      iconBg: "bg-destructive/15",
      iconColor: "text-destructive",
    },
    {
      label: t("dashboard.inQueue"),
      value: queuedPageCount,
      icon: Clock,
      gradient: "from-warning/20 to-warning/5",
      iconBg: "bg-warning/15",
      iconColor: "text-warning",
    },
  ];

  const quickActions = [
    {
      label: t("dashboard.connectSite"),
      description: t("dashboard.connectSiteDesc"),
      icon: Globe,
      href: "/websites",
      gradient: "bg-gradient-to-br from-success to-secondary",
      completed: websiteCount > 0,
      step: 1,
    },
    {
      label: t("dashboard.createTemplate"),
      description: t("dashboard.createTemplateDesc"),
      icon: FileText,
      href: "/templates",
      gradient: "bg-gradient-to-br from-secondary to-info",
      completed: templateCount > 0,
      step: 2,
    },
    {
      label: t("dashboard.createCampaign"),
      description: t("dashboard.createCampaignDesc"),
      icon: Plus,
      href: "/campaigns",
      gradient: "bg-gradient-primary",
      completed: campaignCount > 0,
      step: 3,
    },
  ];

  const showGetStarted = campaignCount === 0 || templateCount === 0 || websiteCount === 0;

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return t("dashboard.justNow");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("dashboard.minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("dashboard.hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    return t("dashboard.daysAgo", { count: days });
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

      {/* Usage Overview Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PagesUsageWidget />
        <AiCreditsWidget />
      </div>

      {/* Usage History */}
      <UsageHistoryWidget />

      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-glow to-secondary p-6 sm:p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-primary-foreground/70">{greeting} 👋</p>
              <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 text-[10px] uppercase tracking-wider font-bold">
                {currentPlan} {t("common.plan")}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{userName || t("dashboard.userFallback")}</h1>
            <p className="text-sm text-primary-foreground/70 max-w-md">
              {t("dashboard.summary", { campaigns: campaignCount, pages: pageCount })}
            </p>
          </div>
          {/* Time Range Filter */}
          <div className="shrink-0">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px] bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map((r) => (
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
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-display-sm">{t("dashboard.getStarted")}</h2>
            <Badge variant="secondary" className="text-[10px]">
              {quickActions.filter(a => a.completed).length}/{quickActions.length} done
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(`${basePath}${action.href}`)}
                className={`group relative overflow-hidden rounded-xl border bg-card p-4 text-left transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 ${
                  action.completed
                    ? "border-success/30 bg-success/5"
                    : "border-border hover:border-primary/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {action.completed ? (
                      <div className="h-10 w-10 rounded-xl bg-success/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                    ) : (
                      <div className={`h-10 w-10 rounded-xl ${action.gradient} flex items-center justify-center`}>
                        <span className="text-sm font-bold text-primary-foreground">{action.step}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-semibold text-sm transition-colors ${
                      action.completed ? "text-success line-through" : "group-hover:text-primary"
                    }`}>{action.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{action.description}</p>
                  </div>
                </div>
                {!action.completed && (
                  <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200 group-hover:translate-x-0 -translate-x-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-display-sm">{t("dashboard.overview")}</h2>
          <Badge variant="secondary" className="text-[11px] bg-muted border-0">
            {timeRanges.find((r) => r.value === timeRange)?.label}
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
                <CardTitle className="text-sm font-semibold">{t("dashboard.pageGeneration")}</CardTitle>
              </div>
              <Select value={pagePeriod} onValueChange={setPagePeriod}>
                <SelectTrigger className="h-7 w-auto gap-1 text-[11px] bg-muted border-0 rounded-md px-2.5">
                  <TrendingUp className="h-3 w-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t("dashboard.weekly")}</SelectItem>
                  <SelectItem value="month">{t("dashboard.monthly")}</SelectItem>
                  <SelectItem value="year">{t("dashboard.yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-2 sm:px-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pageChartData}>
                  <defs>
                    <linearGradient id="pageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 8px 24px rgba(0,0,0,.25)", fontSize: "12px", padding: "8px 12px", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }} labelStyle={{ color: "hsl(var(--popover-foreground))" }} itemStyle={{ color: "hsl(var(--popover-foreground))" }} />
                  <Area type="monotone" dataKey="pages" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#pageGradient)" dot={false} activeDot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }} />
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
                <CardTitle className="text-sm font-semibold">{t("dashboard.campaignActivity")}</CardTitle>
              </div>
              <Select value={campaignPeriod} onValueChange={setCampaignPeriod}>
                <SelectTrigger className="h-7 w-auto gap-1 text-[11px] bg-muted border-0 rounded-md px-2.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t("dashboard.weekly")}</SelectItem>
                  <SelectItem value="month">{t("dashboard.monthly")}</SelectItem>
                  <SelectItem value="year">{t("dashboard.yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-2 px-2 sm:px-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignChartData} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted) / 0.4)" }} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", boxShadow: "0 8px 24px rgba(0,0,0,.25)", fontSize: "12px", padding: "8px 12px", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))" }} labelStyle={{ color: "hsl(var(--popover-foreground))" }} itemStyle={{ color: "hsl(var(--popover-foreground))" }} />
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
                <h3 className="font-semibold">{t("dashboard.aiGenerationsTitle")}</h3>
                <p className="text-sm text-muted-foreground">
                  {loadingAi ? t("common.loading") : t("dashboard.aiUsageCycle", { used: aiUsed, limit: aiLimit })}
                </p>
              </div>
            </div>
            <Badge className="bg-gradient-primary text-primary-foreground border-0 capitalize px-4 py-1.5 text-xs font-semibold self-start sm:self-auto">
              {aiUsage?.plan || "free"} {t("common.plan")}
            </Badge>
          </div>
          {!loadingAi && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{t("dashboard.aiUsed", { used: aiUsed })}</span>
                <span>{t("dashboard.aiRemaining", { remaining: aiLimit - aiUsed })}</span>
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
                <h3 className="font-semibold text-sm">{t("dashboard.campaignsImproved")}</h3>
                <p className="text-2xl font-bold tabular-nums text-success">{improvementStats.improved}</p>
                <p className="text-[10px] text-muted-foreground">{t("dashboard.ofTotalCampaigns", { total: improvementStats.total })}</p>
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
                <h3 className="font-semibold text-sm">{t("dashboard.needsOptimization")}</h3>
                <p className="text-2xl font-bold tabular-nums text-warning">
                  {Math.max(0, improvementStats.total - improvementStats.improved)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t("dashboard.campaignsNotOptimized", { count: Math.max(0, improvementStats.total - improvementStats.improved) })}
                </p>
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
              <CardTitle className="text-sm font-semibold">{t("dashboard.latestJobs")}</CardTitle>
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
              <p className="text-sm text-muted-foreground">{t("dashboard.noGenerationJobs")}</p>
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
                          {job.success_count} ✓ · {job.error_count} ✗ · {job.processed_rows}/{job.total_rows} {t("dashboard.rows")}
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
              <CardTitle className="text-sm font-semibold">{t("dashboard.recentCampaigns")}</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={() => navigate(`${basePath}/campaigns`)}>
                {t("common.viewAll")} <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <div className="overflow-hidden">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b border-border">
                     <th className="text-left py-2.5 px-4 sm:px-6 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">{t("common.name")}</th>
                     <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">{t("common.status")}</th>
                     <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden sm:table-cell">{t("common.progress")}</th>
                     <th className="text-right py-2.5 px-4 font-medium text-muted-foreground text-[11px] uppercase tracking-wider hidden sm:table-cell">{t("common.date")}</th>
                     <th className="text-right py-2.5 px-4 sm:px-6 font-medium text-muted-foreground text-[11px] uppercase tracking-wider">{t("common.actions")}</th>
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
                              <p className="text-sm">{t("dashboard.noCampaignsYet")}</p>
                              <Button size="sm" variant="outline" onClick={() => navigate(`${basePath}/campaigns`)} className="mt-1 rounded-xl">
                                {t("dashboard.createFirstCampaign")}
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
                            <td className="py-3 px-4 sm:px-6 font-medium text-sm truncate max-w-0">{campaign.name}</td>
                            <td className="py-3 px-4">
                              <Badge variant="secondary" className={`${statusColors[campaign.status]} text-[10px] font-medium border capitalize`}>
                                 {translateStatus(campaign.status)}
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
                                   title={t("dashboard.viewCampaign")}
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
              <CardTitle className="text-sm font-semibold">{t("dashboard.recentActivity")}</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary" onClick={() => navigate(`${basePath}/pages`)}>
                {t("common.viewAll")} <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 sm:px-6">
            {recentPages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">{t("dashboard.noRecentActivity")}</p>
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
                           {translateStatus(page.status)}
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
