import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Eye, Users, Clock, MousePointerClick, TrendingUp, TrendingDown,
  Search, ArrowUpDown, BarChart3, Target, Percent, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area, Legend, PieChart, Pie, Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { calculateFreshness } from "@/lib/content-freshness";
import { calculateSeoScore } from "@/lib/seo-score";

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

export default function PagePerformancePage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("views");
  const [timeRange, setTimeRange] = useState("30d");
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: pages = [], isLoading: loadingPages } = useQuery({
    queryKey: ["perf-pages", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("id, title, slug, status, created_at, seo_title, seo_description, seo_keywords, external_url, campaigns(name)")
        .eq("workspace_id", wsId!)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: metrics = [], isLoading: loadingMetrics } = useQuery({
    queryKey: ["page-metrics", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_metrics")
        .select("*")
        .eq("workspace_id", wsId!);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = loadingPages || loadingMetrics;

  // Merge pages with their metrics
  const pagePerformance = useMemo(() => {
    return pages.map((page: any) => {
      const pageMetrics = metrics.filter((m: any) => m.page_id === page.id);
      const totalViews = pageMetrics.reduce((s: number, m: any) => s + (m.views || 0), 0);
      const totalVisitors = pageMetrics.reduce((s: number, m: any) => s + (m.unique_visitors || 0), 0);
      const avgTime = pageMetrics.length > 0
        ? pageMetrics.reduce((s: number, m: any) => s + Number(m.avg_time_on_page || 0), 0) / pageMetrics.length
        : 0;
      const avgBounce = pageMetrics.length > 0
        ? pageMetrics.reduce((s: number, m: any) => s + Number(m.bounce_rate || 0), 0) / pageMetrics.length
        : 0;
      const avgCtr = pageMetrics.length > 0
        ? pageMetrics.reduce((s: number, m: any) => s + Number(m.click_through_rate || 0), 0) / pageMetrics.length
        : 0;
      const totalConversions = pageMetrics.reduce((s: number, m: any) => s + (m.conversions || 0), 0);
      const freshness = calculateFreshness(page.created_at, page.status);
      const seo = page.seo_title || page.seo_description
        ? calculateSeoScore(page.seo_title, page.seo_description, page.seo_keywords, page.title)
        : { score: 0, label: "N/A" };

      return {
        ...page,
        views: totalViews,
        visitors: totalVisitors,
        avgTime: Math.round(avgTime * 10) / 10,
        bounceRate: Math.round(avgBounce * 10) / 10,
        ctr: Math.round(avgCtr * 10) / 10,
        conversions: totalConversions,
        freshness,
        seoScore: seo.score,
        seoLabel: seo.label,
      };
    });
  }, [pages, metrics]);

  // Summary stats
  const summary = useMemo(() => {
    const totalViews = pagePerformance.reduce((s, p) => s + p.views, 0);
    const totalVisitors = pagePerformance.reduce((s, p) => s + p.visitors, 0);
    const avgBounce = pagePerformance.length > 0
      ? Math.round(pagePerformance.reduce((s, p) => s + p.bounceRate, 0) / pagePerformance.length * 10) / 10
      : 0;
    const avgCtr = pagePerformance.length > 0
      ? Math.round(pagePerformance.reduce((s, p) => s + p.ctr, 0) / pagePerformance.length * 10) / 10
      : 0;
    const totalConversions = pagePerformance.reduce((s, p) => s + p.conversions, 0);
    const avgSeo = pagePerformance.length > 0
      ? Math.round(pagePerformance.reduce((s, p) => s + p.seoScore, 0) / pagePerformance.length)
      : 0;
    return { totalViews, totalVisitors, avgBounce, avgCtr, totalConversions, avgSeo };
  }, [pagePerformance]);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = pagePerformance;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "views": return b.views - a.views;
        case "visitors": return b.visitors - a.visitors;
        case "bounce": return a.bounceRate - b.bounceRate;
        case "ctr": return b.ctr - a.ctr;
        case "seo": return b.seoScore - a.seoScore;
        case "conversions": return b.conversions - a.conversions;
        default: return 0;
      }
    });
    return result;
  }, [pagePerformance, search, sortBy]);

  // Top performers for charts
  const topByViews = useMemo(() => {
    return [...pagePerformance]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map(p => ({
        name: p.title.length > 20 ? p.title.slice(0, 20) + "…" : p.title,
        views: p.views,
        visitors: p.visitors,
      }));
  }, [pagePerformance]);

  // Engagement distribution
  const engagementDist = useMemo(() => {
    const buckets = { "0-20%": 0, "20-40%": 0, "40-60%": 0, "60-80%": 0, "80-100%": 0 };
    pagePerformance.forEach(p => {
      const br = p.bounceRate;
      if (br < 20) buckets["0-20%"]++;
      else if (br < 40) buckets["20-40%"]++;
      else if (br < 60) buckets["40-60%"]++;
      else if (br < 80) buckets["60-80%"]++;
      else buckets["80-100%"]++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [pagePerformance]);

  const pieColors = ["hsl(152, 69%, 41%)", "hsl(221, 83%, 53%)", "hsl(38, 92%, 50%)", "hsl(25, 95%, 53%)", "hsl(0, 84%, 60%)"];

  // SEO vs Performance scatter data
  const seoVsPerf = useMemo(() => {
    return pagePerformance
      .filter(p => p.views > 0)
      .slice(0, 20)
      .map(p => ({
        name: p.title.length > 15 ? p.title.slice(0, 15) + "…" : p.title,
        seo: p.seoScore,
        views: p.views,
        ctr: p.ctr,
      }));
  }, [pagePerformance]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Page Performance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track traffic, engagement, and conversion metrics for your published pages.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Views", value: summary.totalViews.toLocaleString(), icon: Eye, color: "text-primary" },
          { label: "Unique Visitors", value: summary.totalVisitors.toLocaleString(), icon: Users, color: "text-emerald-600" },
          { label: "Avg Bounce Rate", value: `${summary.avgBounce}%`, icon: TrendingDown, color: "text-amber-600" },
          { label: "Avg CTR", value: `${summary.avgCtr}%`, icon: MousePointerClick, color: "text-primary" },
          { label: "Conversions", value: summary.totalConversions.toLocaleString(), icon: Target, color: "text-emerald-600" },
          { label: "Avg SEO Score", value: `${summary.avgSeo}/100`, icon: Zap, color: "text-primary" },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-surface">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-[11px] text-muted-foreground font-medium">{stat.label}</span>
              </div>
              <p className="text-xl font-bold tabular-nums">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Pages by Views */}
        <Card className="shadow-surface">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Top Pages by Traffic</h3>
            {isLoading ? (
              <Skeleton className="h-[250px]" />
            ) : topByViews.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topByViews} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="visitors" fill="hsl(152, 69%, 41%)" radius={[0, 4, 4, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                <p>No performance data yet. Metrics will appear here once pages receive traffic.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bounce Rate Distribution */}
        <Card className="shadow-surface">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Bounce Rate Distribution</h3>
            {isLoading ? (
              <Skeleton className="h-[250px]" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={engagementDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}
                  >
                    {engagementDist.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* SEO Score vs Views */}
        <Card className="shadow-surface lg:col-span-2">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">SEO Score vs Traffic (Top 20 Pages)</h3>
            {isLoading ? (
              <Skeleton className="h-[220px]" />
            ) : seoVsPerf.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={seoVsPerf} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <RechartsTooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar yAxisId="left" dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Views" />
                  <Bar yAxisId="right" dataKey="seo" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="SEO Score" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No data available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search pages..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="views">Most Views</SelectItem>
            <SelectItem value="visitors">Most Visitors</SelectItem>
            <SelectItem value="bounce">Lowest Bounce</SelectItem>
            <SelectItem value="ctr">Highest CTR</SelectItem>
            <SelectItem value="seo">Best SEO</SelectItem>
            <SelectItem value="conversions">Most Conversions</SelectItem>
          </SelectContent>
        </Select>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7d</SelectItem>
            <SelectItem value="30d">Last 30d</SelectItem>
            <SelectItem value="90d">Last 90d</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pages table */}
      <Card className="shadow-surface">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No published pages found</p>
              <p className="text-sm mt-1">Publish pages to start tracking performance metrics.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Page</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Views</th>
                    <th className="text-right p-3 font-medium text-muted-foreground hidden sm:table-cell">Visitors</th>
                    <th className="text-right p-3 font-medium text-muted-foreground hidden md:table-cell">Avg Time</th>
                    <th className="text-right p-3 font-medium text-muted-foreground hidden md:table-cell">Bounce</th>
                    <th className="text-right p-3 font-medium text-muted-foreground hidden lg:table-cell">CTR</th>
                    <th className="text-right p-3 font-medium text-muted-foreground hidden lg:table-cell">Conv.</th>
                    <th className="text-center p-3 font-medium text-muted-foreground hidden lg:table-cell">SEO</th>
                    <th className="text-center p-3 font-medium text-muted-foreground hidden lg:table-cell">Freshness</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((page) => (
                    <tr key={page.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[250px]">{page.title}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[250px]">{page.slug}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right tabular-nums font-medium">{page.views.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums hidden sm:table-cell">{page.visitors.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums hidden md:table-cell">{page.avgTime}s</td>
                      <td className="p-3 text-right hidden md:table-cell">
                        <span className={page.bounceRate > 60 ? "text-destructive" : page.bounceRate > 40 ? "text-amber-600" : "text-emerald-600"}>
                          {page.bounceRate}%
                        </span>
                      </td>
                      <td className="p-3 text-right tabular-nums hidden lg:table-cell">{page.ctr}%</td>
                      <td className="p-3 text-right tabular-nums hidden lg:table-cell">{page.conversions}</td>
                      <td className="p-3 text-center hidden lg:table-cell">
                        <Badge variant="outline" className="text-[10px]">{page.seoScore}/100</Badge>
                      </td>
                      <td className="p-3 text-center hidden lg:table-cell">
                        <Badge variant="outline" className={`text-[10px] ${page.freshness.color}`}>
                          {page.freshness.label}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state hint */}
      {!isLoading && pages.length > 0 && metrics.length === 0 && (
        <Card className="shadow-surface border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Connect analytics to see real data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Performance metrics will populate automatically as your published pages receive traffic. You can also import analytics data via the API.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
