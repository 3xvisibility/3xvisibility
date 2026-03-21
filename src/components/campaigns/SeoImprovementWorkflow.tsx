import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  TrendingUp,
  ArrowRight,
  Loader2,
  Check,
  AlertTriangle,
  History,
  Zap,
  Target,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  canonical_url: string | null;
  status: string;
}

interface SeoImprovementWorkflowProps {
  pages: PageData[];
  campaignId: string;
  workspaceId: string;
  onPagesUpdated?: () => void;
}

type ScoredPage = PageData & {
  seoScore: number;
  seaScore: number;
  geoScore: number;
  overall: number;
};

function scorePage(p: PageData): ScoredPage {
  const seo = calculateContentSeoScore(p.title || "", p.content || "", p.seo_title || "", p.seo_description || "");
  const sea = calculateContentSeaScore(p.title || "", p.content || "", p.seo_title || "", p.seo_description || "");
  const geo = calculateContentGeoScore(p.title || "", p.content || "", p.seo_title || "", p.seo_description || "");
  const overall = Math.round(seo.score * 0.4 + sea.score * 0.3 + geo.score * 0.3);
  return { ...p, seoScore: seo.score, seaScore: sea.score, geoScore: geo.score, overall };
}

type Suggestion = {
  pageId: string;
  pageTitle: string;
  currentScore: number;
  issues: string[];
  action: string;
  expectedImpact: number;
};

export function SeoImprovementWorkflow({
  pages,
  campaignId,
  workspaceId,
  onPagesUpdated,
}: SeoImprovementWorkflowProps) {
  const [analysisRun, setAnalysisRun] = useState(false);
  const [improving, setImproving] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const scored = useMemo(() => {
    if (!analysisRun) return [];
    return pages.filter((p) => p.status !== "failed").map(scorePage);
  }, [pages, analysisRun]);

  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, p) => s + p.overall, 0) / scored.length) : 0;

  const distribution = useMemo(() => {
    const d = { excellent: 0, good: 0, fair: 0, poor: 0 };
    scored.forEach((p) => {
      if (p.overall >= 80) d.excellent++;
      else if (p.overall >= 60) d.good++;
      else if (p.overall >= 40) d.fair++;
      else d.poor++;
    });
    return d;
  }, [scored]);

  const suggestions: Suggestion[] = useMemo(() => {
    return scored
      .filter((p) => p.overall < 80)
      .sort((a, b) => a.overall - b.overall)
      .slice(0, 10)
      .map((p) => {
        const issues: string[] = [];
        let action = "full_rewrite";
        if (p.seoScore < 60) issues.push("Low content SEO");
        if (p.seaScore < 60) issues.push("Weak conversion signals");
        if (p.geoScore < 60) issues.push("Missing local signals");
        if (!p.seo_title || p.seo_title.length < 20) issues.push("Missing/short SEO title");
        if (!p.seo_description || p.seo_description.length < 50) issues.push("Missing/short meta description");
        if ((p.content || "").length < 500) issues.push("Content too short");

        if (issues.length <= 2 && p.seoScore >= 60) action = "headings";
        if (!p.seo_title || !p.seo_description) action = "meta";

        const expectedImpact = Math.min(30, Math.round((80 - p.overall) * 0.7));
        return { pageId: p.id, pageTitle: p.title, currentScore: p.overall, issues, action, expectedImpact };
      });
  }, [scored]);

  const improveMutation = useMutation({
    mutationFn: async (suggestion: Suggestion) => {
      setImproving(suggestion.pageId);
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke("ai-seo-assistant", {
        body: {
          page_id: suggestion.pageId,
          action: suggestion.action,
          instruction: `Fix these issues: ${suggestion.issues.join(", ")}. Target score: 80+.`,
          context: { language: "en" },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Apply the result
      const result = data.result;
      const updates: Record<string, any> = {};

      if (suggestion.action === "meta") {
        try {
          const parsed = JSON.parse(result);
          if (parsed.descriptions?.[0]) updates.seo_description = parsed.descriptions[0];
          if (parsed.suggested_title) updates.seo_title = parsed.suggested_title;
        } catch {
          updates.seo_description = result;
        }
      } else if (suggestion.action === "titles") {
        try {
          const titles = JSON.parse(result);
          if (Array.isArray(titles) && titles[0]) {
            updates.title = titles[0];
            updates.seo_title = titles[0];
          }
        } catch {
          updates.seo_title = result;
        }
      } else {
        updates.content = result;
      }

      if (Object.keys(updates).length > 0) {
        const { error: upErr } = await supabase
          .from("generated_pages")
          .update(updates)
          .eq("id", suggestion.pageId);
        if (upErr) throw upErr;
      }

      // Log improvement
      if (user) {
        await supabase.from("page_improvements" as any).insert({
          page_id: suggestion.pageId,
          workspace_id: workspaceId,
          user_id: user.id,
          action: suggestion.action,
          field: suggestion.action,
          score_before: suggestion.currentScore,
          score_after: Math.min(100, suggestion.currentScore + suggestion.expectedImpact),
          details: { issues: suggestion.issues, campaign_id: campaignId },
        });
      }

      return suggestion;
    },
    onSuccess: (s) => {
      toast({ title: "Improved", description: `"${s.pageTitle.slice(0, 40)}" has been optimized.` });
      setImproving(null);
      onPagesUpdated?.();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setImproving(null);
    },
  });

  // Improvement history
  const { data: history = [] } = useQuery({
    queryKey: ["page-improvements", campaignId],
    enabled: historyOpen,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_improvements" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  const campaignHistory = history.filter((h: any) => {
    const details = h.details as any;
    return details?.campaign_id === campaignId;
  });

  const scoreColor = (s: number) =>
    s >= 80 ? "text-success" : s >= 60 ? "text-primary" : s >= 40 ? "text-warning" : "text-destructive";

  const barColor = (s: number) =>
    s >= 80 ? "bg-success" : s >= 60 ? "bg-primary" : s >= 40 ? "bg-warning" : "bg-destructive";

  if (!analysisRun) {
    return (
      <Card className="border-0 shadow-surface">
        <CardContent className="py-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Generate → Analyze → Improve</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Run an SEO analysis across all {pages.filter((p) => p.status !== "failed").length} pages,
              get AI-powered suggestions, and apply improvements to boost your scores.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={() => setAnalysisRun(true)} className="gap-2">
              <Target className="h-4 w-4" /> Run SEO Analysis
            </Button>
            <Button variant="outline" onClick={() => setHistoryOpen(true)} className="gap-2">
              <History className="h-4 w-4" /> History
            </Button>
          </div>
        </CardContent>

        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Improvement History</DialogTitle>
              <DialogDescription>Past AI improvements for this campaign.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-80">
              {campaignHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No improvements applied yet.</p>
              ) : (
                <div className="space-y-2">
                  {campaignHistory.map((h: any) => (
                    <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Zap className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium capitalize">{h.action?.replace("_", " ")}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className={scoreColor(h.score_before)}>{h.score_before}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className={scoreColor(h.score_after)}>{h.score_after}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score Overview */}
      <Card className="border-0 shadow-surface">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" /> Campaign SEO Analysis
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)} className="h-7 text-xs gap-1">
              <History className="h-3 w-3" /> History
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAnalysisRun(false)} className="h-7 text-xs">
              Re-analyze
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <span className={`text-3xl font-bold tabular-nums ${scoreColor(avgScore)}`}>{avgScore}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">Avg Score</p>
            </div>
            <div className="flex-1">
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColor(avgScore)}`} style={{ width: `${avgScore}%` }} />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                <span>{scored.length} pages analyzed</span>
                <span>Target: 80+</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Excellent (80+)", count: distribution.excellent, cls: "text-success" },
              { label: "Good (60-79)", count: distribution.good, cls: "text-primary" },
              { label: "Fair (40-59)", count: distribution.fair, cls: "text-warning" },
              { label: "Poor (<40)", count: distribution.poor, cls: "text-destructive" },
            ].map((d) => (
              <div key={d.label}>
                <span className={`text-lg font-bold ${d.cls}`}>{d.count}</span>
                <p className="text-[10px] text-muted-foreground">{d.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-0 shadow-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Improvement Suggestions
              <Badge variant="secondary" className="text-[10px]">{suggestions.length} pages</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              <div className="divide-y">
                {suggestions.map((s) => (
                  <div key={s.pageId} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.pageTitle}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.issues.map((issue) => (
                          <Badge key={issue} variant="outline" className="text-[10px] text-destructive border-destructive/30">
                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> {issue}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-center px-2">
                      <span className={`text-sm font-bold tabular-nums ${scoreColor(s.currentScore)}`}>{s.currentScore}</span>
                      <div className="flex items-center gap-1 text-[10px]">
                        <TrendingUp className="h-2.5 w-2.5 text-success" />
                        <span className="text-success font-medium">+{s.expectedImpact}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => improveMutation.mutate(s)}
                      disabled={!!improving}
                      className="shrink-0 gap-1.5"
                    >
                      {improving === s.pageId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      Fix
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {suggestions.length === 0 && scored.length > 0 && (
        <Card className="border-0 shadow-surface">
          <CardContent className="py-8 text-center">
            <Check className="h-10 w-10 mx-auto text-success mb-3" />
            <h3 className="font-semibold text-success">All Pages Optimized!</h3>
            <p className="text-sm text-muted-foreground mt-1">All pages score 80 or above. Great work!</p>
          </CardContent>
        </Card>
      )}

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Improvement History</DialogTitle>
            <DialogDescription>Past AI improvements for this campaign.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-80">
            {campaignHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No improvements applied yet.</p>
            ) : (
              <div className="space-y-2">
                {campaignHistory.map((h: any) => (
                  <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Zap className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium capitalize">{h.action?.replace("_", " ")}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className={scoreColor(h.score_before)}>{h.score_before}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className={scoreColor(h.score_after)}>{h.score_after}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
