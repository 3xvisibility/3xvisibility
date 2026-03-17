import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  FileText,
  Send,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Tag,
  Download,
  FileDown,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { calculateSeoScore } from "@/lib/seo-score";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--popover-foreground))",
};

export default function AnalyticsPage() {
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  // Fetch all generated pages
  const { data: pages = [], isLoading: loadingPages } = useQuery({
    queryKey: ["analytics-pages", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("id, title, status, created_at, seo_title, seo_description, seo_keywords, campaign_id")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch campaigns
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["analytics-campaigns", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, processed_rows, total_rows, failed_rows, created_at, campaign_type")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch generation jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ["analytics-jobs", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generation_jobs")
        .select("id, status, total_rows, processed_rows, success_count, error_count, created_at, completed_at, campaign_id")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // AI usage
  const { data: aiUsage } = useQuery({
    queryKey: ["analytics-ai-usage"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("ai_generations_used, ai_generations_limit, plan")
        .maybeSingle();
      return data;
    },
  });

  const isLoading = loadingPages || loadingCampaigns;

  // Compute stats
  const stats = useMemo(() => {
    const total = pages.length;
    const published = pages.filter((p) => p.status === "published").length;
    const pending = pages.filter((p) => p.status === "pending").length;
    const failed = pages.filter((p) => p.status === "failed").length;
    const successRate = total > 0 ? Math.round(((published + pending) / total) * 100) : 0;
    return { total, published, pending, failed, successRate };
  }, [pages]);

  // SEO score distribution
  const seoDistribution = useMemo(() => {
    const buckets = { Excellent: 0, Good: 0, Fair: 0, Poor: 0, "No SEO": 0 };
    for (const page of pages) {
      const p = page as any;
      if (!p.seo_title && !p.seo_description) {
        buckets["No SEO"]++;
      } else {
        const result = calculateSeoScore(p.seo_title, p.seo_description, p.seo_keywords, page.title);
        buckets[result.label]++;
      }
    }
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [pages]);

  const seoColors: Record<string, string> = {
    Excellent: "hsl(152, 69%, 41%)",
    Good: "hsl(221, 83%, 53%)",
    Fair: "hsl(38, 92%, 50%)",
    Poor: "hsl(0, 84%, 60%)",
    "No SEO": "hsl(215, 14%, 65%)",
  };

  // Pages over time (grouped by day)
  const pagesOverTime = useMemo(() => {
    const dayMap = new Map<string, { date: string; generated: number; published: number; failed: number }>();
    for (const page of pages) {
      const day = new Date(page.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!dayMap.has(day)) dayMap.set(day, { date: day, generated: 0, published: 0, failed: 0 });
      const entry = dayMap.get(day)!;
      entry.generated++;
      if (page.status === "published") entry.published++;
      if (page.status === "failed") entry.failed++;
    }
    return [...dayMap.values()].slice(-14);
  }, [pages]);

  // Per-campaign success rates
  const campaignSuccessRates = useMemo(() => {
    const campaignMap = new Map<string, { name: string; published: number; pending: number; failed: number; total: number }>();
    for (const page of pages) {
      if (!page.campaign_id) continue;
      if (!campaignMap.has(page.campaign_id)) {
        const campaign = campaigns.find((c) => c.id === page.campaign_id);
        campaignMap.set(page.campaign_id, {
          name: campaign ? (campaign.name.length > 18 ? campaign.name.slice(0, 18) + "…" : campaign.name) : "Unknown",
          published: 0,
          pending: 0,
          failed: 0,
          total: 0,
        });
      }
      const entry = campaignMap.get(page.campaign_id)!;
      entry.total++;
      if (page.status === "published") entry.published++;
      else if (page.status === "failed") entry.failed++;
      else entry.pending++;
    }
    return [...campaignMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [pages, campaigns]);

  // Publishing funnel data
  const publishingFunnel = useMemo(() => {
    const totalGenerated = pages.length;
    const withSeo = pages.filter((p) => (p as any).seo_title || (p as any).seo_description).length;
    const published = pages.filter((p) => p.status === "published").length;
    return [
      { stage: "Generated", count: totalGenerated, fill: "hsl(var(--primary))" },
      { stage: "SEO Optimized", count: withSeo, fill: "hsl(38, 92%, 50%)" },
      { stage: "Published", count: published, fill: "hsl(152, 69%, 41%)" },
    ];
  }, [pages]);

  // Generation job stats
  const jobStats = useMemo(() => {
    const completed = jobs.filter((j) => j.status === "completed").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const running = jobs.filter((j) => j.status === "running" || j.status === "pending").length;
    const totalSuccessCount = jobs.reduce((s, j) => s + (j.success_count || 0), 0);
    const totalErrorCount = jobs.reduce((s, j) => s + (j.error_count || 0), 0);
    const avgSuccessRate = (totalSuccessCount + totalErrorCount) > 0
      ? Math.round((totalSuccessCount / (totalSuccessCount + totalErrorCount)) * 100)
      : 0;
    // Avg processing time for completed jobs
    const completedJobs = jobs.filter((j) => j.completed_at && j.created_at);
    const avgTimeMs = completedJobs.length > 0
      ? completedJobs.reduce((s, j) => s + (new Date(j.completed_at!).getTime() - new Date(j.created_at).getTime()), 0) / completedJobs.length
      : 0;
    const avgTimeMins = Math.round(avgTimeMs / 60000);
    return { completed, failed, running, totalSuccessCount, totalErrorCount, avgSuccessRate, avgTimeMins, total: jobs.length };
  }, [jobs]);

  // Campaign performance
  const campaignPerformance = useMemo(() => {
    return campaigns.slice(-10).map((c) => ({
      name: c.name.length > 15 ? c.name.slice(0, 15) + "…" : c.name,
      pages: c.processed_rows || 0,
      total: c.total_rows || 0,
    }));
  }, [campaigns]);

  // Average SEO score
  const avgSeoScore = useMemo(() => {
    const scored = pages.filter((p) => (p as any).seo_title || (p as any).seo_description);
    if (scored.length === 0) return 0;
    const total = scored.reduce((sum, p) => {
      const pa = p as any;
      return sum + calculateSeoScore(pa.seo_title, pa.seo_description, pa.seo_keywords, p.title).score;
    }, 0);
    return Math.round(total / scored.length);
  }, [pages]);

  const aiUsed = aiUsage?.ai_generations_used || 0;
  const aiLimit = aiUsage?.ai_generations_limit || 50;
  const aiPercent = aiLimit > 0 ? Math.round((aiUsed / aiLimit) * 100) : 0;

  const downloadFile = useCallback((content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const exportCSV = useCallback(() => {
    const rows: string[][] = [
      ["Title", "Status", "SEO Score", "SEO Title", "SEO Description", "Keywords", "Created"],
    ];
    for (const page of pages) {
      const p = page as any;
      const score = p.seo_title || p.seo_description
        ? calculateSeoScore(p.seo_title, p.seo_description, p.seo_keywords, page.title).score.toString()
        : "N/A";
      rows.push([
        `"${(page.title || "").replace(/"/g, '""')}"`,
        page.status,
        score,
        `"${(p.seo_title || "").replace(/"/g, '""')}"`,
        `"${(p.seo_description || "").replace(/"/g, '""')}"`,
        `"${(p.seo_keywords || []).join(", ")}"`,
        new Date(page.created_at).toISOString(),
      ]);
    }
    downloadFile(rows.map((r) => r.join(",")).join("\n"), "analytics-report.csv", "text/csv");
    toast({ title: "CSV exported", description: `${pages.length} pages exported.` });
  }, [pages, downloadFile, toast]);

  const exportPDF = useCallback(() => {
    const date = new Date().toLocaleDateString();
    const seoDist = seoDistribution.map((d) => `${d.name}: ${d.value}`).join(" | ");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Analytics Report</title>
<style>
  body { font-family: -apple-system, sans-serif; padding: 40px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
  h2 { font-size: 16px; margin-top: 28px; color: #334155; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-value { font-size: 28px; font-weight: 700; }
  .stat-label { font-size: 11px; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; font-weight: 600; }
  .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; }
  .section { margin-bottom: 24px; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
  <h1>Campaign Analytics Report</h1>
  <p style="color:#64748b;font-size:13px;">Generated on ${date}</p>

  <div class="stats">
    <div class="stat"><div class="stat-value">${stats.total}</div><div class="stat-label">Total Pages</div></div>
    <div class="stat"><div class="stat-value" style="color:#16a34a">${stats.published}</div><div class="stat-label">Published</div></div>
    <div class="stat"><div class="stat-value" style="color:#3b82f6">${stats.pending}</div><div class="stat-label">Pending</div></div>
    <div class="stat"><div class="stat-value" style="color:#dc2626">${stats.failed}</div><div class="stat-label">Failed</div></div>
  </div>

  <div class="section">
    <h2>Generation Success Rate</h2>
    <p style="font-size:13px;">Overall: <strong>${stats.successRate}%</strong> | Job Success: <strong>${jobStats.avgSuccessRate}%</strong> | Avg Time: <strong>${jobStats.avgTimeMins}min</strong></p>
  </div>

  <div class="section">
    <h2>SEO Score Distribution</h2>
    <p style="font-size:13px;">Average Score: <strong>${avgSeoScore}/100</strong></p>
    <p style="font-size:13px;color:#64748b;">${seoDist}</p>
  </div>

  <div class="section">
    <h2>AI Generation Usage</h2>
    <p style="font-size:13px;">${aiUsed} / ${aiLimit} generations used (${aiPercent}%) &mdash; Plan: ${aiUsage?.plan || "free"}</p>
  </div>

  <div class="section">
    <h2>Campaign Performance</h2>
    <table>
      <thead><tr><th>Campaign</th><th>Processed</th><th>Total Rows</th></tr></thead>
      <tbody>${campaignPerformance.map((c) => `<tr><td>${c.name}</td><td>${c.pages}</td><td>${c.total}</td></tr>`).join("")}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Page Details (Top 50)</h2>
    <table>
      <thead><tr><th>Title</th><th>Status</th><th>SEO Score</th><th>Created</th></tr></thead>
      <tbody>${pages.slice(0, 50).map((p) => {
        const pa = p as any;
        const score = pa.seo_title || pa.seo_description
          ? calculateSeoScore(pa.seo_title, pa.seo_description, pa.seo_keywords, p.title).score
          : "—";
        return `<tr><td>${p.title}</td><td>${p.status}</td><td>${score}</td><td>${new Date(p.created_at).toLocaleDateString()}</td></tr>`;
      }).join("")}</tbody>
    </table>
  </div>

  <div class="footer">Analytics Report &mdash; Generated automatically</div>
</body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 300);
    }
    toast({ title: "PDF report opened", description: "Use your browser's print dialog to save as PDF." });
  }, [pages, stats, seoDistribution, campaignPerformance, avgSeoScore, aiUsed, aiLimit, aiPercent, aiUsage, jobStats, toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-display flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Campaign Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track generation success rates, publishing performance, and SEO quality.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={pages.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={pages.length === 0}>
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> PDF Report
          </Button>
        </div>
      </div>

      {/* Top stats — 6 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Pages", value: stats.total, icon: FileText, color: "text-foreground" },
          { label: "Published", value: stats.published, icon: Send, color: "text-success" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-primary" },
          { label: "Failed", value: stats.failed, icon: XCircle, color: "text-destructive" },
          { label: "Success Rate", value: `${stats.successRate}%`, icon: Percent, color: stats.successRate >= 80 ? "text-success" : stats.successRate >= 50 ? "text-warning" : "text-destructive" },
          { label: "Avg SEO", value: avgSeoScore, icon: Tag, color: avgSeoScore >= 70 ? "text-success" : avgSeoScore >= 40 ? "text-warning" : "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="shadow-surface">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-12" />
              ) : (
                <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generation Job Stats */}
      <Card className="shadow-surface">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Generation Job Overview
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Jobs", value: jobStats.total },
              { label: "Completed", value: jobStats.completed, color: "text-success" },
              { label: "Failed", value: jobStats.failed, color: "text-destructive" },
              { label: "Running", value: jobStats.running, color: "text-primary" },
              { label: "Job Success Rate", value: `${jobStats.avgSuccessRate}%`, color: jobStats.avgSuccessRate >= 80 ? "text-success" : "text-warning" },
              { label: "Avg Time", value: jobStats.avgTimeMins > 0 ? `${jobStats.avgTimeMins}m` : "—" },
            ].map((item) => (
              <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
                <p className={`text-xl font-bold tabular-nums ${item.color || "text-foreground"}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pages over time */}
        <Card className="shadow-surface">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Pages Over Time
            </h3>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : pagesOverTime.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={pagesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Area
                    type="monotone"
                    dataKey="generated"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.15)"
                    strokeWidth={2}
                    name="Generated"
                  />
                  <Area
                    type="monotone"
                    dataKey="published"
                    stroke="hsl(152, 69%, 41%)"
                    fill="hsl(152, 69%, 41%, 0.1)"
                    strokeWidth={2}
                    name="Published"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stroke="hsl(0, 84%, 60%)"
                    fill="hsl(0, 84%, 60%, 0.08)"
                    strokeWidth={2}
                    name="Failed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Publishing Funnel */}
        <Card className="shadow-surface">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              Publishing Funnel
            </h3>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : stats.total === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {publishingFunnel.map((step, i) => {
                  const percentage = stats.total > 0 ? Math.round((step.count / stats.total) * 100) : 0;
                  return (
                    <div key={step.stage} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{step.stage}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {step.count} <span className="text-[10px]">({percentage}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-8 bg-muted/50 rounded-md overflow-hidden relative">
                        <div
                          className="h-full rounded-md transition-all duration-500 flex items-center justify-center"
                          style={{
                            width: `${Math.max(percentage, 2)}%`,
                            backgroundColor: step.fill,
                          }}
                        >
                          {percentage > 15 && (
                            <span className="text-[10px] font-bold text-white">{percentage}%</span>
                          )}
                        </div>
                      </div>
                      {i < publishingFunnel.length - 1 && (
                        <div className="flex justify-center text-muted-foreground">
                          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 2v8M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Per-Campaign Success Rates (stacked bar) */}
        <Card className="shadow-surface">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Campaign Success Rates
            </h3>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : campaignSuccessRates.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No campaigns yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={campaignSuccessRates} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} className="text-muted-foreground" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} className="text-muted-foreground" width={100} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="published" stackId="a" fill="hsl(152, 69%, 41%)" name="Published" />
                  <Bar dataKey="pending" stackId="a" fill="hsl(var(--primary))" name="Pending" />
                  <Bar dataKey="failed" stackId="a" fill="hsl(0, 84%, 60%)" name="Failed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* SEO Score Distribution */}
        <Card className="shadow-surface">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                SEO Score Distribution
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Avg:</span>
                <span className={`text-sm font-bold tabular-nums ${
                  avgSeoScore >= 85 ? "text-success" :
                  avgSeoScore >= 60 ? "text-primary" :
                  avgSeoScore >= 35 ? "text-warning" : "text-destructive"
                }`}>
                  {avgSeoScore}
                </span>
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : seoDistribution.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie
                      data={seoDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {seoDistribution.map((entry) => (
                        <Cell key={entry.name} fill={seoColors[entry.name] || "#888"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {seoDistribution.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: seoColors[d.name] || "#888" }}
                      />
                      <span className="flex-1 text-muted-foreground">{d.name}</span>
                      <span className="font-semibold tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Third row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Campaign performance */}
        <Card className="shadow-surface">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Campaign Performance
            </h3>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : campaignPerformance.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                No campaigns yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={campaignPerformance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="pages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Processed" />
                  <Bar dataKey="total" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} name="Total Rows" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* AI Usage */}
        <Card className="shadow-surface">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Generation Usage
              </h3>
              <Badge variant="outline" className="capitalize text-[10px]">{aiUsage?.plan || "free"}</Badge>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-bold tabular-nums">{aiUsed}</span>
                  <span className="text-sm text-muted-foreground">/ {aiLimit} this month</span>
                </div>
                <Progress value={aiPercent} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1.5">{aiPercent}% used</p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums">{aiLimit - aiUsed}</p>
                  <p className="text-[10px] text-muted-foreground">Remaining</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums">{stats.total > 0 ? Math.round(aiUsed / stats.total * 10) / 10 : 0}</p>
                  <p className="text-[10px] text-muted-foreground">AI/Page Avg</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums">{campaigns.length}</p>
                  <p className="text-[10px] text-muted-foreground">Campaigns</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
