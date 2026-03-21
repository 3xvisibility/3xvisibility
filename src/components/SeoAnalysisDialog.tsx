import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Lightbulb, BarChart3 } from "lucide-react";
import { validateSeoRules, getSeoRuleSummary, type SeoRuleContext, type SeoRuleResult } from "@/lib/seo-rules";
import { calculateSeoScore } from "@/lib/seo-score";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";

interface SeoAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: {
    title: string;
    slug: string;
    content: string;
    seo_title?: string | null;
    seo_description?: string | null;
    seo_keywords?: string[] | null;
    canonical_url?: string | null;
    external_url?: string | null;
  } | null;
  /** Other page titles in the same campaign for uniqueness checks */
  campaignTitles?: string[];
  /** Other page slugs in the same campaign for uniqueness checks */
  campaignSlugs?: string[];
}

export function SeoAnalysisDialog({ open, onOpenChange, page, campaignTitles, campaignSlugs }: SeoAnalysisDialogProps) {
  const analysis = useMemo(() => {
    if (!page) return null;

    // SEO rules validation
    const ctx: SeoRuleContext = {
      title: page.title,
      slug: page.slug,
      seoTitle: page.seo_title || page.title,
      seoDescription: page.seo_description || "",
      canonicalUrl: page.canonical_url || null,
      content: page.content,
      jsonLd: page.content, // JSON-LD is embedded in content
      campaignTitles,
      campaignSlugs,
    };
    const ruleResults = validateSeoRules(ctx);
    const summary = getSeoRuleSummary(ruleResults);

    // Content scores
    const seo = calculateContentSeoScore(page.title, page.content, page.slug, page.external_url || undefined);
    const sea = calculateContentSeaScore(page.title, page.content, page.slug, page.external_url || undefined);
    const geo = calculateContentGeoScore(page.title, page.content, page.slug, page.external_url || undefined);

    // Metadata score
    const metaScore = calculateSeoScore(page.seo_title, page.seo_description, page.seo_keywords, page.title);

    // Overall composite score
    const overallScore = Math.round((seo.score * 0.4 + metaScore.score * 0.3 + sea.score * 0.15 + geo.score * 0.15));

    return { ruleResults, summary, seo, sea, geo, metaScore, overallScore };
  }, [page, campaignTitles, campaignSlugs]);

  if (!page || !analysis) return null;

  const scoreColor = (score: number) =>
    score >= 85 ? "text-emerald-600" :
    score >= 60 ? "text-primary" :
    score >= 35 ? "text-amber-600" : "text-destructive";

  const barColor = (score: number) =>
    score >= 85 ? "bg-emerald-500" :
    score >= 60 ? "bg-primary" :
    score >= 35 ? "bg-amber-500" : "bg-destructive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            SEO Analysis
          </DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{page.title}</p>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-5 pr-2">
            {/* Overall Score */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Overall SEO Health</span>
                <span className={`text-2xl font-bold tabular-nums ${scoreColor(analysis.overallScore)}`}>
                  {analysis.overallScore}/100
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor(analysis.overallScore)}`}
                  style={{ width: `${analysis.overallScore}%` }}
                />
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Content SEO", score: analysis.seo.score, weight: "40%" },
                { label: "Metadata", score: analysis.metaScore.score, weight: "30%" },
                { label: "SEA Quality", score: analysis.sea.score, weight: "15%" },
                { label: "GEO Signals", score: analysis.geo.score, weight: "15%" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">{item.weight}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor(item.score)}`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${scoreColor(item.score)}`}>{item.score}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Rules Validation */}
            <div className="rounded-lg border border-border">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">SEO Rules</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {analysis.summary.passed.length}/{analysis.summary.total} passed
                </span>
              </div>

              {analysis.summary.errors.length > 0 && (
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-1.5 mb-2">
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-xs font-semibold text-destructive">Errors ({analysis.summary.errors.length})</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.summary.errors.map((r) => (
                      <RuleItem key={r.id} result={r} />
                    ))}
                  </div>
                </div>
              )}

              {analysis.summary.warnings.length > 0 && (
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-foreground">Warnings ({analysis.summary.warnings.length})</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.summary.warnings.map((r) => (
                      <RuleItem key={r.id} result={r} />
                    ))}
                  </div>
                </div>
              )}

              {analysis.summary.passed.length > 0 && (
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-muted-foreground">Passed ({analysis.summary.passed.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {analysis.summary.passed.map((r) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="text-[11px] text-muted-foreground">{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {(analysis.summary.errors.length > 0 || analysis.summary.warnings.length > 0) && (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">Recommendations</span>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {[...analysis.summary.errors, ...analysis.summary.warnings].map((r) => (
                    <li key={r.id} className="flex items-start gap-2">
                      <span className="text-foreground">•</span>
                      <span><span className="font-medium text-foreground">{r.label}:</span> {r.tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Future Integration Placeholder */}
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">
                🔌 External SEO tools (Semrush, GSC, GA) can be integrated here for deeper insights.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RuleItem({ result }: { result: SeoRuleResult }) {
  const icon = result.severity === "error"
    ? <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
    : <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />;

  return (
    <div className="flex items-start gap-2">
      {icon}
      <div>
        <p className="text-[11px] font-medium text-foreground">{result.label}</p>
        <p className="text-[10px] text-muted-foreground">{result.tip}</p>
      </div>
    </div>
  );
}

/** Compute campaign-level SEO summary for a collection of pages */
export function computeCampaignSeoSummary(pages: {
  title: string;
  content: string;
  slug: string;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  external_url?: string | null;
}[]) {
  if (pages.length === 0) return null;

  let seoSum = 0, seaSum = 0, geoSum = 0, metaSum = 0;
  const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };

  for (const p of pages) {
    const seo = calculateContentSeoScore(p.title, p.content, p.slug, p.external_url || undefined);
    const sea = calculateContentSeaScore(p.title, p.content, p.slug, p.external_url || undefined);
    const geo = calculateContentGeoScore(p.title, p.content, p.slug, p.external_url || undefined);
    const meta = calculateSeoScore(p.seo_title, p.seo_description, p.seo_keywords, p.title);

    const composite = Math.round(seo.score * 0.4 + meta.score * 0.3 + sea.score * 0.15 + geo.score * 0.15);

    seoSum += seo.score;
    seaSum += sea.score;
    geoSum += geo.score;
    metaSum += meta.score;

    if (composite >= 85) distribution.excellent++;
    else if (composite >= 60) distribution.good++;
    else if (composite >= 35) distribution.fair++;
    else distribution.poor++;
  }

  const n = pages.length;
  return {
    avgSeo: Math.round(seoSum / n),
    avgSea: Math.round(seaSum / n),
    avgGeo: Math.round(geoSum / n),
    avgMeta: Math.round(metaSum / n),
    overall: Math.round((seoSum * 0.4 + metaSum * 0.3 + seaSum * 0.15 + geoSum * 0.15) / n),
    distribution,
    total: n,
  };
}
