import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, BarChart3, Sparkles, Loader2, ChevronDown, Plus, Minus, Target, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { validateSeoRules, getSeoRuleSummary, type SeoRuleContext } from "@/lib/seo-rules";
import { calculateSeoScore } from "@/lib/seo-score";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";
import { analyzeExtendedSeo } from "@/lib/seo-extended-analysis";
import { analyzeKeywordUsage, resolvePrimaryKeyword, type KeywordUsageAnalysis } from "@/lib/keyword-usage-suggestions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/friendly-errors";
import { extractEdgeError } from "@/lib/edge-function-error";
import { UnifiedSeoPanel } from "@/components/UnifiedSeoPanel";
import { calculateUnifiedSeoScore } from "@/lib/unified-seo-score";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface SeoAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: {
    id?: string;
    workspace_id?: string | null;
    campaign_id?: string | null;
    title: string;
    slug: string;
    content: string;
    seo_title?: string | null;
    seo_description?: string | null;
    seo_keywords?: string[] | null;
    canonical_url?: string | null;
    external_url?: string | null;
    status?: string;
    external_id?: string | null;
    website_id?: string | null;
  } | null;
  campaignTitles?: string[];
  campaignSlugs?: string[];
  onUpdated?: () => void;
}

type AnalysisPage = NonNullable<SeoAnalysisDialogProps["page"]>;

function inferPublishType(page: Pick<AnalysisPage, "external_url">) {
  return page.external_url?.toLowerCase().includes("/product/") ? "product" : "page";
}

function normalizeKeywords(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value
    .filter((keyword): keyword is string => typeof keyword === "string" && keyword.trim().length > 0)
    .slice(0, 8);
}

export function SeoAnalysisDialog({ open, onOpenChange, page: initialPage, campaignTitles, campaignSlugs, onUpdated }: SeoAnalysisDialogProps) {
  const [fixing, setFixing] = useState(false);
  const [fixStep, setFixStep] = useState("");
  const [fixProgress, setFixProgress] = useState(0);
  type PassEntry = { pass: number; before: number; after: number; delta: number; weak: string[]; status: "running" | "improved" | "stagnant" };
  const [passHistory, setPassHistory] = useState<PassEntry[]>([]);
  const [currentIteration, setCurrentIteration] = useState(0);
  type FactorLive = { key: string; label: string; baseline: number; current: number; previous: number; lastPass: number };
  const [factorLive, setFactorLive] = useState<Record<string, FactorLive>>({});
  const [localPage, setLocalPage] = useState(initialPage);
  const [csvRow, setCsvRow] = useState<Record<string, unknown> | null>(null);
  const [templateContent, setTemplateContent] = useState<string | null>(null);
  const [supplementalLoading, setSupplementalLoading] = useState(false);
  const [supplementalError, setSupplementalError] = useState(false);
  const { toast } = useToast();

  // Sync localPage when dialog opens with new page
  useEffect(() => { setLocalPage(initialPage); }, [initialPage]);

  // Fetch matching CSV row + template content (best-effort, non-blocking) so we
  // can power the keyword usage suggestions panel.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!open || !initialPage?.campaign_id) {
        setCsvRow(null);
        setTemplateContent(null);
        setSupplementalLoading(false);
        setSupplementalError(false);
        return;
      }
      setSupplementalLoading(true);
      setSupplementalError(false);
      try {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("template_id, csv_data, mapping")
          .eq("id", initialPage.campaign_id)
          .maybeSingle();
        if (cancelled) return;

        // Match CSV row by slug or title — best-effort.
        const rows = Array.isArray(campaign?.csv_data) ? (campaign!.csv_data as Record<string, unknown>[]) : [];
        const slugLower = (initialPage.slug || "").toLowerCase();
        const titleLower = (initialPage.title || "").toLowerCase();
        const matched = rows.find((r) => {
          const values = Object.values(r).map((v) => String(v ?? "").toLowerCase());
          return values.some((v) => v && (slugLower.includes(v) || titleLower.includes(v) || v === slugLower || v === titleLower));
        }) || rows[0] || null;
        setCsvRow(matched);

        if (campaign?.template_id) {
          const { data: tpl } = await supabase
            .from("templates")
            .select("content")
            .eq("id", campaign.template_id)
            .maybeSingle();
          if (!cancelled) setTemplateContent(tpl?.content ?? null);
        }
      } catch {
        if (!cancelled) {
          setCsvRow(null);
          setTemplateContent(null);
          setSupplementalError(true);
        }
      } finally {
        if (!cancelled) setSupplementalLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, initialPage?.campaign_id, initialPage?.slug, initialPage?.title]);

  const page = localPage;

  const analysis = useMemo(() => {
    if (!page) return null;

    const ctx: SeoRuleContext = {
      title: page.title,
      slug: page.slug,
      seoTitle: page.seo_title || page.title,
      seoDescription: page.seo_description || "",
      canonicalUrl: page.canonical_url || null,
      content: page.content,
      jsonLd: page.content,
      campaignTitles,
      campaignSlugs,
    };
    const ruleResults = validateSeoRules(ctx);
    const summary = getSeoRuleSummary(ruleResults);

    const seo = calculateContentSeoScore(page.title, page.content, page.slug, {
      url: page.external_url || undefined,
      description: page.seo_description || "",
      seoTitle: page.seo_title || undefined,
      seoKeywords: page.seo_keywords || undefined,
    });
    const sea = calculateContentSeaScore(page.title, page.content, page.slug, page.external_url || undefined);
    const geo = calculateContentGeoScore(page.title, page.content, page.slug, page.external_url || undefined);
    const metaScore = calculateSeoScore(page.seo_title, page.seo_description, page.seo_keywords, page.title);
    const overallScore = Math.round((seo.score * 0.4 + metaScore.score * 0.3 + sea.score * 0.15 + geo.score * 0.15));
    const extended = analyzeExtendedSeo({
      html: page.content,
      seoTitle: page.seo_title,
      seoDescription: page.seo_description,
      seoKeywords: page.seo_keywords,
    });

    return { ruleResults, summary, seo, sea, geo, metaScore, overallScore, extended };
  }, [page, campaignTitles, campaignSlugs]);

  // Keyword usage suggestions — driven by CSV primary keyword + template content.
  const keywordUsage = useMemo<KeywordUsageAnalysis | null>(() => {
    if (!page) return null;
    const primary = resolvePrimaryKeyword(csvRow, page.title);
    if (!primary) return null;
    return analyzeKeywordUsage({
      primaryKeyword: primary,
      templateContent,
      pageTitle: page.title,
      pageContent: page.content,
      seoTitle: page.seo_title,
      seoDescription: page.seo_description,
      seoKeywords: page.seo_keywords,
      csvRow,
    });
  }, [page, csvRow, templateContent]);

  const applyKeywordSuggestions = async (
    additions: string[] = [],
    removals: string[] = [],
  ) => {
    if (!page?.id) return;
    const current = new Set((page.seo_keywords || []).map((k) => k.trim()).filter(Boolean));
    additions.forEach((k) => k && current.add(k.trim()));
    removals.forEach((k) => current.delete(k.trim()));
    const next = [...current].slice(0, 12);
    try {
      const { error } = await supabase
        .from("generated_pages")
        .update({ seo_keywords: next.length ? next : null })
        .eq("id", page.id);
      if (error) throw error;
      setLocalPage({ ...page, seo_keywords: next });
      toast({
        title: "Keywords updated",
        description: `${additions.length} added, ${removals.length} removed.`,
      });
      onUpdated?.();
    } catch (err: any) {
      toast({ title: "Update failed", description: friendlyError(err.message), variant: "destructive" });
    }
  };

  const handleFixAndRepublish = async () => {
    if (!page?.id) return;
    const currentPage = page;

    setFixing(true);
    setFixProgress(0);
    setPassHistory([]);
    setCurrentIteration(0);
    setFactorLive({});

    const STRONG = 80;
    const MAX_ITERATIONS = 8;


    const scoreOf = (
      values: {
        title: string;
        description: string;
        keywords: string[];
        content: string;
      },
      canonical: string | null,
    ) =>
      calculateUnifiedSeoScore({
        title: values.title,
        content: values.content,
        slug: currentPage.slug,
        seoTitle: values.title,
        seoDescription: values.description,
        seoKeywords: values.keywords,
        canonicalUrl: canonical,
        url: currentPage.external_url,
      });

    const factorScore = (result: ReturnType<typeof calculateUnifiedSeoScore>, key: string) =>
      result.factors.find((f) => f.key === key)?.score ?? 0;

    try {
      // Detect language from campaign
      let detectedLanguage: string | null = null;
      if (currentPage.campaign_id) {
        setFixStep("Detecting language...");
        setFixProgress(3);
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("language")
          .eq("id", currentPage.campaign_id)
          .maybeSingle();
        if (campaign?.language) detectedLanguage = campaign.language;
      }

      const resolveCanonicalUrl = async (targetPage: AnalysisPage) => {
        if (targetPage.canonical_url) return targetPage.canonical_url;
        if (targetPage.external_url) return targetPage.external_url;
        if (!targetPage.website_id) return null;
        const { data: website, error } = await supabase
          .from("websites")
          .select("url")
          .eq("id", targetPage.website_id)
          .maybeSingle();
        if (error || !website?.url) return null;
        const baseUrl = website.url.replace(/\/+$/, "");
        const slug = targetPage.slug.replace(/^\/+/, "");
        return slug ? `${baseUrl}/${slug}` : baseUrl;
      };

      const canonicalUrl = await resolveCanonicalUrl(currentPage);

      // Working copy — mutated per iteration, weak factors only.
      const working = {
        title: currentPage.seo_title || currentPage.title,
        description: currentPage.seo_description || "",
        keywords: normalizeKeywords(currentPage.seo_keywords),
        content: currentPage.content,
      };

      const baselineUnified = scoreOf(working, canonicalUrl);
      let bestUnified = baselineUnified;
      let bestSnapshot = { ...working };

      const TRACKED_FACTORS: Record<string, string> = {
        title: "Title",
        description: "Meta description",
        keywords: "Keywords",
        content: "Content",
      };
      const seedFactors: Record<string, FactorLive> = {};
      for (const [key, label] of Object.entries(TRACKED_FACTORS)) {
        const s = baselineUnified.factors.find((f) => f.key === key)?.score ?? 0;
        seedFactors[key] = { key, label, baseline: s, current: s, previous: s, lastPass: 0 };
      }
      setFactorLive(seedFactors);

      let iteration = 0;
      let weakKeys = baselineUnified.factors
        .filter((f) => ["title", "description", "content", "keywords"].includes(f.key) && f.score < STRONG)
        .map((f) => f.key);

      if (weakKeys.length === 0) {
        toast({
          title: "Already optimized",
          description: "Every factor is already ≥80. Nothing to improve.",
        });
        setFixing(false);
        setFixStep("");
        setFixProgress(0);
        return;
      }
      let stagnantPasses = 0;

      while (iteration < MAX_ITERATIONS && weakKeys.length > 0) {
        iteration++;
        setCurrentIteration(iteration);
        const baseProgress = 5 + (iteration - 1) * Math.floor(70 / MAX_ITERATIONS);
        setFixStep(`Pass ${iteration}/${MAX_ITERATIONS} — improving: ${weakKeys.join(", ")}`);
        setFixProgress(baseProgress);

        const iterBefore = scoreOf(working, canonicalUrl);
        const beforeFactor = (k: string) => factorScore(iterBefore, k);
        const passStartScore = iterBefore.score;
        const currentWeak = [...weakKeys];
        setPassHistory((prev) => [...prev, { pass: iteration, before: passStartScore, after: passStartScore, delta: 0, weak: currentWeak, status: "running" }]);

        // Candidate values start from current working copy.
        const candidate = { ...working };

        if (currentPage.website_id && currentPage.external_id) {
          const optimizeFields: string[] = [];
          if (weakKeys.includes("title")) optimizeFields.push("seo_title");
          if (weakKeys.includes("description")) optimizeFields.push("seo_description");
          if (weakKeys.includes("keywords")) optimizeFields.push("seo_keywords");
          if (weakKeys.includes("content")) optimizeFields.push("content");

          const { data: optimizeData, error: optimizeErr } = await supabase.functions.invoke(
            "optimize-seo-content",
            {
              body: {
                website_id: currentPage.website_id,
                page_external_id: currentPage.external_id,
                page_title: currentPage.title,
                page_content: working.content,
                page_slug: currentPage.slug,
                page_url: currentPage.external_url,
                page_type: inferPublishType(currentPage),
                workspace_id: currentPage.workspace_id,
                optimize_fields: optimizeFields,
                page_seo_title: working.title,
                page_seo_description: working.description,
                page_seo_keywords: working.keywords,
                language: detectedLanguage,
                iteration,
              },
            },
          );
          if (optimizeErr) throw new Error(await extractEdgeError(optimizeErr, "Optimization failed"));
          if (optimizeData?.error) throw new Error(optimizeData.error);

          const optimized = optimizeData?.result || {};
          if (weakKeys.includes("title") && typeof optimized.seo_title === "string" && optimized.seo_title.trim()) {
            candidate.title = optimized.seo_title.trim();
          }
          if (weakKeys.includes("description") && typeof optimized.seo_description === "string" && optimized.seo_description.trim()) {
            candidate.description = optimized.seo_description.trim();
          }
          if (weakKeys.includes("keywords") && normalizeKeywords(optimized.seo_keywords).length > 0) {
            candidate.keywords = normalizeKeywords(optimized.seo_keywords);
          }
          if (weakKeys.includes("content") && typeof optimized.content === "string" && optimized.content.trim()) {
            candidate.content = optimized.content;
          }
        } else {
          if (weakKeys.includes("title")) {
            const { data: titleData, error: titleErr } = await supabase.functions.invoke("ai-seo-assistant", {
              body: { page_id: currentPage.id, action: "titles", iteration },
            });
            if (titleErr) throw titleErr;
            if (titleData?.error) throw new Error(titleData.error);
            try {
              const titles = JSON.parse(titleData.result);
              if (Array.isArray(titles) && titles.length > 0) candidate.title = titles[0];
            } catch {}
          }
          if (weakKeys.includes("description")) {
            const { data: metaData, error: metaErr } = await supabase.functions.invoke("ai-seo-assistant", {
              body: { page_id: currentPage.id, action: "meta", iteration },
            });
            if (metaErr) throw metaErr;
            if (metaData?.error) throw new Error(metaData.error);
            try {
              const meta = JSON.parse(metaData.result);
              if (meta?.descriptions?.[0]) candidate.description = meta.descriptions[0];
            } catch {}
          }
          if (weakKeys.includes("keywords")) {
            const { data: kwData, error: kwErr } = await supabase.functions.invoke("ai-seo-assistant", {
              body: { page_id: currentPage.id, action: "keywords", iteration },
            });
            if (kwErr) throw kwErr;
            if (kwData?.error) throw new Error(kwData.error);
            try {
              const kw = JSON.parse(kwData.result);
              const allKw = [...(kw.primary || []), ...(kw.secondary || []), ...(kw.long_tail || [])];
              if (allKw.length > 0) candidate.keywords = allKw.slice(0, 8);
            } catch {}
          }
          if (weakKeys.includes("content")) {
            const { data: rewriteData, error: rewriteErr } = await supabase.functions.invoke("ai-seo-assistant", {
              body: { page_id: currentPage.id, action: "full_rewrite", iteration },
            });
            if (rewriteErr) throw rewriteErr;
            if (rewriteData?.error) throw new Error(rewriteData.error);
            if (rewriteData?.result) candidate.content = rewriteData.result;
          }
        }

        // Deterministic polish for title / description on the candidate.
        if (weakKeys.includes("title")) {
          const hasSeparator = /[|\-–·•]/.test(candidate.title);
          if (!hasSeparator && candidate.title.length <= 50) {
            candidate.title = `${candidate.title} | ${(candidate.keywords[0] || "Trusted Local Service").slice(0, 30)}`;
            if (candidate.title.length > 60) candidate.title = candidate.title.slice(0, 60).trim();
          }
          const actionWordRegex = /(buy|get|shop|order|book|reserve|request|contact|call|discover|subscribe|free|best|top|new|save|deal|premium)/i;
          if (!actionWordRegex.test(candidate.title)) {
            const c = `Get ${candidate.title}`;
            candidate.title = c.length <= 60 ? c : candidate.title;
          }
        }
        if (weakKeys.includes("description")) {
          if (candidate.description.length < 120) {
            const filler = ` Contact our trusted local team today for a free quote — fast, reliable service near you.`;
            candidate.description = (candidate.description + filler).slice(0, 156).trim();
          } else if (candidate.description.length > 160) {
            candidate.description = candidate.description.slice(0, 156).trim();
          }
        }

        // Per-factor guard: accept a field ONLY if its factor score improved.
        const iterAfter = scoreOf(candidate, canonicalUrl);
        const afterFactor = (k: string) => factorScore(iterAfter, k);
        for (const key of weakKeys) {
          if (afterFactor(key) > beforeFactor(key)) {
            (working as any)[key === "title" ? "title" : key === "description" ? "description" : key === "keywords" ? "keywords" : "content"] =
              (candidate as any)[key === "title" ? "title" : key === "description" ? "description" : key === "keywords" ? "keywords" : "content"];
          }
        }

        const nowUnified = scoreOf(working, canonicalUrl);
        const improved = nowUnified.score > bestUnified.score;
        if (improved) {
          bestUnified = nowUnified;
          bestSnapshot = { ...working };
          stagnantPasses = 0;
        } else {
          stagnantPasses++;
        }

        const passAfter = nowUnified.score;
        const passDelta = passAfter - passStartScore;
        setPassHistory((prev) =>
          prev.map((p) =>
            p.pass === iteration
              ? { ...p, after: passAfter, delta: passDelta, status: passDelta > 0 ? "improved" : "stagnant" }
              : p,
          ),
        );

        weakKeys = nowUnified.factors
          .filter((f) => ["title", "description", "content", "keywords"].includes(f.key) && f.score < STRONG)
          .map((f) => f.key);

        if (weakKeys.length === 0) break;
        if (stagnantPasses >= 2) break; // give up if 2 consecutive passes yielded no gain
      }


      // Use best snapshot ever seen — never regress below baseline.
      if (bestUnified.score <= baselineUnified.score) {
        setFixing(false);
        setFixStep("");
        setFixProgress(0);
        toast({
          title: "No improvement found",
          description: `Kept your current content — best draft after ${iteration} pass(es) scored ${bestUnified.score} vs current ${baselineUnified.score}.`,
        });
        return;
      }

      const newTitle = bestSnapshot.title;
      const newDescription = bestSnapshot.description;
      const newKeywords = bestSnapshot.keywords;
      const newContent = bestSnapshot.content;

      setFixStep("Saving updated page...");
      setFixProgress(84);
      const { error: updateErr } = await supabase
        .from("generated_pages")
        .update({
          title: newTitle,
          seo_title: newTitle,
          seo_description: newDescription,
          seo_keywords: newKeywords.length > 0 ? newKeywords : null,
          content: newContent,
          canonical_url: canonicalUrl,
        })
        .eq("id", currentPage.id);
      if (updateErr) throw updateErr;

      let republished = false;
      if (currentPage.status === "published" && currentPage.external_id && currentPage.website_id) {
        setFixStep("Republishing updated page...");
        setFixProgress(92);
        const { data: pubData, error: pubErr } = await supabase.functions.invoke("publish-pages", {
          body: {
            page_ids: [currentPage.id],
            publish_type: inferPublishType(currentPage),
            website_id: currentPage.website_id,
            elementor_mode: "native",
            overwrite_design: true,
          },
        });
        if (pubErr) throw pubErr;
        if (pubData?.error) throw new Error(pubData.error);
        if (pubData?.failed && !pubData?.published) {
          const failedMessage = pubData?.results?.[0]?.error || "Republish failed.";
          throw new Error(failedMessage);
        }
        if (pubData?.published > 0) republished = true;
      }

      setFixProgress(100);
      setFixStep("Done!");

      setLocalPage({
        ...currentPage,
        title: newTitle,
        seo_title: newTitle,
        seo_description: newDescription,
        seo_keywords: newKeywords,
        content: newContent,
        canonical_url: canonicalUrl,
      });

      const remainingWeak = bestUnified.factors
        .filter((f) => ["title", "description", "content", "keywords"].includes(f.key) && f.score < STRONG)
        .map((f) => f.key);
      toast({
        title: "SEO issues fixed!",
        description: `${baselineUnified.score} → ${bestUnified.score} after ${iteration} pass(es).${
          remainingWeak.length ? ` Still <80: ${remainingWeak.join(", ")}.` : " All targeted factors now ≥80."
        }${republished ? " Republished." : ""}`,
      });
      onUpdated?.();
    } catch (err: any) {
      toast({ title: "Fix failed", description: friendlyError(err.message), variant: "destructive" });
    } finally {
      setFixing(false);
      setFixStep("");
      setFixProgress(0);
    }
  };


  // If the dialog is open but page data is unavailable, render a graceful
  // fallback instead of a blank dialog, so the user always sees a clear state.
  if (!page || !analysis) {
    if (!open) return null;
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              SEO Analysis unavailable
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            We couldn't load the page details needed for this analysis. Please close
            this dialog and try again.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const hasRuleIssues = analysis.summary.errors.length > 0 || analysis.summary.warnings.length > 0;
  const hasFailedChecks =
    analysis.seo.checks.some((c) => !c.passed) ||
    analysis.metaScore.checks.some((c) => !c.passed) ||
    analysis.sea.checks.some((c) => !c.passed) ||
    analysis.geo.checks.some((c) => !c.passed);
  // Also consult the unified engine (the headline panel) so the Fix button
  // appears whenever the shared score is below the 90 tier or a critical factor
  // fails — even if the legacy rule engine finds nothing.
  const unifiedResult = calculateUnifiedSeoScore({
    title: page.title,
    content: page.content,
    slug: page.slug,
    seoTitle: page.seo_title,
    seoDescription: page.seo_description,
    seoKeywords: page.seo_keywords,
    canonicalUrl: page.canonical_url,
    url: page.external_url,
  });
  const hasIssues =
    hasRuleIssues ||
    hasFailedChecks ||
    !unifiedResult.gatePassed ||
    unifiedResult.score < 90;

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
      <DialogContent className="sm:max-w-2xl h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b border-border">
          <DialogTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            SEO Analysis
          </DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{page.title}</p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <ErrorBoundary
            fallback={
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center space-y-2">
                <AlertTriangle className="h-6 w-6 text-destructive mx-auto" />
                <p className="text-sm font-medium">Couldn't render the analysis details</p>
                <p className="text-xs text-muted-foreground">
                  You can still run the AI fix below to regenerate optimized content.
                </p>
              </div>
            }
          >
          <div className="space-y-5">
            {supplementalLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading keyword suggestions…
              </div>
            )}
            {supplementalError && !supplementalLoading && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Couldn't load keyword suggestions — analysis and AI fix still available.
              </div>
            )}
            {/* Unified SEO Score — shared engine, headline metric */}
            <UnifiedSeoPanel
              input={{
                title: page.title,
                content: page.content,
                slug: page.slug,
                seoTitle: page.seo_title,
                seoDescription: page.seo_description,
                seoKeywords: page.seo_keywords,
                canonicalUrl: page.canonical_url,
                url: page.external_url,
              }}
            />

            {/* Legacy Score (kept for detailed sub-breakdowns) */}
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

            {/* Score Breakdown — clickable to expand checks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Content SEO", score: analysis.seo.score, weight: "40%", checks: analysis.seo.checks },
                { label: "Metadata", score: analysis.metaScore.score, weight: "30%", checks: analysis.metaScore.checks },
                { label: "SEA Quality", score: analysis.sea.score, weight: "15%", checks: analysis.sea.checks },
                { label: "GEO Signals", score: analysis.geo.score, weight: "15%", checks: analysis.geo.checks },
              ].map((item) => {
                const passedCount = item.checks.filter((c) => c.passed).length;
                const total = item.checks.length;
                return (
                  <Collapsible key={item.label} className="rounded-lg border border-border overflow-hidden">
                    <CollapsibleTrigger className="w-full p-3 hover:bg-muted/40 transition-colors text-left group">
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs text-muted-foreground truncate">{item.label}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">{item.weight}</Badge>
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 shrink-0" />
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
                      <p className="text-[10px] text-muted-foreground mt-1 text-left">
                        {passedCount}/{total} checks passed
                      </p>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border bg-muted/20 px-3 py-2 space-y-1.5">
                        {item.checks.map((check, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            {check.passed ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className={`text-[10px] leading-tight ${check.passed ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                                {check.label}
                              </p>
                              {!check.passed && check.tip && (
                                <p className="text-[9px] text-muted-foreground mt-0.5">{check.tip}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>

            {/* Extended Analysis — additive: AI / multi-engine readiness, readability, headings, keywords */}
            <Collapsible className="rounded-lg border border-border overflow-hidden" defaultOpen>
              <CollapsibleTrigger className="w-full p-3 hover:bg-muted/40 transition-colors text-left group">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold">AI &amp; Multi-Engine SEO</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">extra</Badge>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 shrink-0" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(analysis.extended.score)}`}
                      style={{ width: `${analysis.extended.score}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${scoreColor(analysis.extended.score)}`}>{analysis.extended.score}</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border bg-muted/20 px-3 py-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded border border-border p-2">
                      <div className="text-muted-foreground">Readability</div>
                      <div className="font-semibold tabular-nums">{analysis.extended.readability.score} · {analysis.extended.readability.grade}</div>
                      <div className="text-muted-foreground">{analysis.extended.readability.avgWordsPerSentence} w/sent</div>
                    </div>
                    <div className="rounded border border-border p-2">
                      <div className="text-muted-foreground">Headings</div>
                      <div className="font-semibold tabular-nums">H1·{analysis.extended.headings.h1Count} H2·{analysis.extended.headings.h2Count} H3·{analysis.extended.headings.h3Count}</div>
                      <div className="text-muted-foreground">{analysis.extended.headings.orderOk ? "Order OK" : "Skipped levels"}</div>
                    </div>
                    <div className="rounded border border-border p-2">
                      <div className="text-muted-foreground">Primary kw</div>
                      <div className="font-semibold truncate">{analysis.extended.keywords.primary || "—"}</div>
                      <div className="text-muted-foreground">{analysis.extended.keywords.densityPct}% density</div>
                    </div>
                  </div>
                  {analysis.extended.keywords.suggestions.length > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      Suggested keywords:{" "}
                      {analysis.extended.keywords.suggestions.map((k) => (
                        <Badge key={k} variant="outline" className="text-[9px] mr-1">{k}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {analysis.extended.checks.map((check, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        {check.passed ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`text-[10px] leading-tight ${check.passed ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                            {check.label}
                          </p>
                          {!check.passed && check.tip && (
                            <p className="text-[9px] text-muted-foreground mt-0.5">{check.tip}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Keyword Usage Suggestions — based on CSV primary keyword + template */}
            {keywordUsage && (
              <Collapsible className="rounded-lg border border-border overflow-hidden" defaultOpen>
                <CollapsibleTrigger className="w-full p-3 hover:bg-muted/40 transition-colors text-left group">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-semibold">Keyword Usage Suggestions</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 truncate max-w-[180px]">
                        primary: {keywordUsage.primary}
                      </Badge>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="tabular-nums">
                      density {keywordUsage.primaryDensity}% · {keywordUsage.primaryOccurrences}× in {keywordUsage.totalWords}w
                    </span>
                    <span className="tabular-nums">
                      +{keywordUsage.recommendedAdditions.length} add · −{keywordUsage.recommendedRemovals.length} remove
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-border bg-muted/20 px-3 py-3 space-y-3">
                    {/* Placement chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { ok: keywordUsage.inTitle || keywordUsage.inSeoTitle, label: "Title" },
                        { ok: keywordUsage.inSeoDescription, label: "Meta description" },
                        { ok: keywordUsage.inFirstParagraph, label: "First paragraph" },
                        { ok: keywordUsage.inHeadings, label: "Headings" },
                      ].map((p) => (
                        <Badge
                          key={p.label}
                          variant="outline"
                          className={`text-[10px] gap-1 ${p.ok ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" : "border-amber-500/40 text-amber-700 dark:text-amber-400"}`}
                        >
                          {p.ok ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                          {p.label}
                        </Badge>
                      ))}
                    </div>

                    {/* Notes */}
                    {keywordUsage.notes.length > 0 && (
                      <ul className="space-y-1">
                        {keywordUsage.notes.map((n, i) => (
                          <li key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span>{n}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Recommended additions */}
                    {keywordUsage.recommendedAdditions.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Plus className="h-2.5 w-2.5" /> Add
                          </span>
                          {page.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] gap-1"
                              onClick={() => applyKeywordSuggestions(keywordUsage.recommendedAdditions.map((s) => s.keyword), [])}
                            >
                              <Plus className="h-2.5 w-2.5" /> Add all
                            </Button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {keywordUsage.recommendedAdditions.map((s) => (
                            <div key={s.keyword} className="flex items-start justify-between gap-2 text-[10px] rounded border border-border/60 bg-background/40 px-2 py-1.5">
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{s.keyword}</p>
                                <p className="text-muted-foreground">{s.reason}</p>
                              </div>
                              {page.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[10px] gap-1 shrink-0"
                                  onClick={() => applyKeywordSuggestions([s.keyword], [])}
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended removals */}
                    {keywordUsage.recommendedRemovals.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive flex items-center gap-1">
                            <Minus className="h-2.5 w-2.5" /> Remove
                          </span>
                          {page.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] gap-1"
                              onClick={() => applyKeywordSuggestions([], keywordUsage.recommendedRemovals.map((s) => s.keyword))}
                            >
                              <Minus className="h-2.5 w-2.5" /> Remove all
                            </Button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {keywordUsage.recommendedRemovals.map((s) => (
                            <div key={s.keyword} className="flex items-start justify-between gap-2 text-[10px] rounded border border-border/60 bg-background/40 px-2 py-1.5">
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">{s.keyword}</p>
                                <p className="text-muted-foreground">{s.reason}</p>
                              </div>
                              {page.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[10px] gap-1 shrink-0 text-destructive hover:text-destructive"
                                  onClick={() => applyKeywordSuggestions([], [s.keyword])}
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {keywordUsage.recommendedAdditions.length === 0 && keywordUsage.recommendedRemovals.length === 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        Keyword usage looks balanced — no changes recommended.
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

          </div>
          </ErrorBoundary>
        </div>

        {/* Pinned footer — always visible */}
        {hasIssues && page.id && (
          <div className="relative z-10 shrink-0 border-t border-border bg-background px-6 py-4 space-y-2">
            <Button
              onClick={handleFixAndRepublish}
              disabled={fixing}
              className="w-full gap-2"
              size="lg"
            >
              {fixing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{fixStep || "Processing..."}</>
              ) : (
                <><Sparkles className="h-4 w-4" />AI Fix All Issues {page.status === "published" && page.external_id ? "& Republish" : ""}</>
              )}
            </Button>
            {fixing && (
              <div className="space-y-2">
                <Progress value={fixProgress} className="h-1.5" />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="truncate">{fixStep}</span>
                  {currentIteration > 0 && (
                    <span className="shrink-0 font-mono">Iteration {currentIteration}/8</span>
                  )}
                </div>
                {passHistory.length > 0 && (
                  <div className="rounded-md border bg-muted/30 p-2 max-h-40 overflow-y-auto space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pass history</p>
                    {passHistory.map((p) => (
                      <div key={p.pass} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono text-muted-foreground shrink-0">#{p.pass}</span>
                        <span className="flex-1 truncate text-muted-foreground">{p.weak.join(", ") || "—"}</span>
                        <span className="font-mono tabular-nums">
                          {p.before} →{" "}
                          {p.status === "running" ? (
                            <span className="text-muted-foreground animate-pulse">…</span>
                          ) : (
                            <span className={p.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                              {p.after} ({p.delta > 0 ? "+" : ""}{p.delta})
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
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
    const seo = calculateContentSeoScore(p.title, p.content, p.slug, {
      url: p.external_url || undefined,
      description: p.seo_description || "",
      seoTitle: p.seo_title || undefined,
      seoKeywords: p.seo_keywords || undefined,
    });
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
