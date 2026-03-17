import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, FileText, Globe, Sparkles, TrendingUp, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  processing: "bg-primary/10 text-primary border-primary/20",
  draft: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  queued: "bg-warning/10 text-warning border-warning/20",
};

export default function DashboardPage() {
  const { data: campaignCount = 0, isLoading: loadingCampaigns } = useQuery({
    queryKey: ["dashboard-campaign-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("campaigns").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pageCount = 0, isLoading: loadingPages } = useQuery({
    queryKey: ["dashboard-page-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("generated_pages").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: websiteCount = 0, isLoading: loadingWebsites } = useQuery({
    queryKey: ["dashboard-website-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("websites").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: recentCampaigns = [], isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-recent-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, processed_rows, total_rows, created_at")
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

  // Mock chart data based on real counts
  const pageChartData = [
    { name: "Mon", pages: Math.round(pageCount * 0.1) },
    { name: "Tue", pages: Math.round(pageCount * 0.15) },
    { name: "Wed", pages: Math.round(pageCount * 0.08) },
    { name: "Thu", pages: Math.round(pageCount * 0.2) },
    { name: "Fri", pages: Math.round(pageCount * 0.25) },
    { name: "Sat", pages: Math.round(pageCount * 0.12) },
    { name: "Sun", pages: Math.round(pageCount * 0.1) },
  ];

  const campaignChartData = [
    { name: "Week 1", campaigns: Math.max(1, Math.round(campaignCount * 0.2)) },
    { name: "Week 2", campaigns: Math.max(1, Math.round(campaignCount * 0.3)) },
    { name: "Week 3", campaigns: Math.max(1, Math.round(campaignCount * 0.25)) },
    { name: "Week 4", campaigns: Math.max(1, Math.round(campaignCount * 0.25)) },
  ];

  const isLoading = loadingCampaigns || loadingPages || loadingWebsites;
  const aiUsed = aiUsage?.ai_generations_used || 0;
  const aiLimit = aiUsage?.ai_generations_limit || 50;
  const aiPercent = aiLimit > 0 ? Math.round((aiUsed / aiLimit) * 100) : 0;

  const stats = [
    { label: "Total Campaigns", value: campaignCount, icon: Rocket, change: "+12%", color: "text-primary" },
    { label: "Generated Pages", value: pageCount, icon: FileText, change: "+24%", color: "text-secondary" },
    { label: "Connected Sites", value: websiteCount, icon: Globe, change: "+2", color: "text-success" },
    { label: "AI Credits Used", value: aiUsed, icon: Sparkles, subtext: `/ ${aiLimit}`, color: "text-warning" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-display">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here's an overview of your activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card
            key={stat.label}
            className="card-interactive border-0 shadow-surface overflow-hidden"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-muted`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                {stat.change && (
                  <Badge variant="secondary" className="text-[11px] font-medium bg-success/10 text-success border-0 gap-0.5">
                    <ArrowUpRight className="h-3 w-3" />
                    {stat.change}
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums tracking-tight">{stat.value}</span>
                    {stat.subtext && (
                      <span className="text-sm text-muted-foreground">{stat.subtext}</span>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Generation Chart */}
        <Card className="border-0 shadow-surface">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Page Generation</CardTitle>
              <Badge variant="secondary" className="text-[11px] bg-muted border-0">
                <TrendingUp className="h-3 w-3 mr-1" /> This week
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pageChartData}>
                  <defs>
                    <linearGradient id="pageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(239, 84%, 67%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pages"
                    stroke="hsl(239, 84%, 67%)"
                    strokeWidth={2}
                    fill="url(#pageGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Activity Chart */}
        <Card className="border-0 shadow-surface">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Campaign Activity</CardTitle>
              <Badge variant="secondary" className="text-[11px] bg-muted border-0">
                This month
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,0,0,.08)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="campaigns" fill="hsl(187, 92%, 42%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Usage + Subscription */}
      <Card className="border-0 shadow-surface overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">AI Generations</h3>
                <p className="text-sm text-muted-foreground">
                  {loadingAi ? "Loading..." : `${aiUsed} of ${aiLimit} credits used this month`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-gradient-primary text-primary-foreground border-0 capitalize px-3 py-1">
                {aiUsage?.plan || "free"} plan
              </Badge>
            </div>
          </div>
          {!loadingAi && (
            <div className="mt-4">
              <Progress value={aiPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">{100 - aiPercent}% remaining</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card className="border-0 shadow-surface">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Progress</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {loadingRecent ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                    </tr>
                  ))
                ) : recentCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Rocket className="h-8 w-8 text-muted-foreground/40" />
                        <p>No campaigns yet. Create your first campaign to get started.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentCampaigns.map((campaign, index) => (
                    <tr
                      key={campaign.id}
                      className={`border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors duration-150 ${
                        index % 2 === 1 ? "bg-muted/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-medium">{campaign.name}</td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary" className={`${statusColors[campaign.status]} text-[11px] font-medium border`}>
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 tabular-nums text-muted-foreground">
                        {campaign.processed_rows || 0}/{campaign.total_rows || 0}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-muted-foreground">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
