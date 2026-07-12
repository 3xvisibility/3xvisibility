import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  RefreshCw,
  Globe,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { extractEdgeError } from "@/lib/edge-function-error";

interface LivePage {
  id: string;
  title: string;
  slug: string;
  url: string;
  type: "page" | "product";
  status: string;
  content: string;
  excerpt: string;
  modified: string;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
}

interface PageResult {
  ok: boolean;
  pushed?: boolean;
  url?: string;
  error?: string;
}

interface ExistingSiteOptimizePanelProps {
  /** Connected website id whose live pages should be updated. */
  websiteId: string;
  workspaceId?: string;
  /** Scanned keywords/terms used to steer the optimization. */
  keywords: string;
  terms?: string;
}

/**
 * Bridges the "existing website" keyword scan with the SEO Optimization + CMS
 * connector pipeline: fetch the live pages of a connected site, then rewrite
 * their SEO fields and body text using the auto-scanned keywords and push the
 * changes straight back to the live site (same URL, no new page created).
 */
export function ExistingSiteOptimizePanel({
  websiteId,
  workspaceId,
  keywords,
  terms,
}: ExistingSiteOptimizePanelProps) {
  const { toast } = useToast();
  const [loadingPages, setLoadingPages] = useState(false);
  const [pages, setPages] = useState<LivePage[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [results, setResults] = useState<Record<string, PageResult>>({});

  const loadPages = async () => {
    setLoadingPages(true);
    setPages(null);
    setResults({});
    try {
      const { data, error } = await supabase.functions.invoke("fetch-site-content", {
        body: { website_id: websiteId, content_type: "pages" },
      });
      if (error) throw new Error(await extractEdgeError(error, "Could not load live pages"));
      if (data?.error) throw new Error(data.error);
      const items: LivePage[] = data?.items ?? [];
      setPages(items);
      setSelected(new Set(items.slice(0, 10).map((p) => p.id)));
      if (!items.length) {
        toast({ title: "No pages found", description: "This site returned no editable pages." });
      }
    } catch (err: any) {
      toast({ title: "Failed to load pages", description: err.message, variant: "destructive" });
    } finally {
      setLoadingPages(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const optimizeSelected = async () => {
    if (!pages) return;
    const targets = pages.filter((p) => selected.has(p.id));
    if (!targets.length) {
      toast({ title: "Select at least one page", variant: "destructive" });
      return;
    }

    const kw = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    const tm = (terms || "").split(",").map((k) => k.trim()).filter(Boolean);
    const instruction =
      `Optimize this page around these auto-scanned target keywords: ${kw.join(", ") || "(none)"}.` +
      (tm.length ? ` Prioritise these services/terms where relevant: ${tm.join(", ")}.` : "") +
      ` Keep the existing page design and structure intact — only refine the wording for SEO.`;

    setOptimizing(true);
    setProgress({ done: 0, total: targets.length });
    const nextResults: Record<string, PageResult> = {};

    for (let i = 0; i < targets.length; i++) {
      const page = targets[i];
      try {
        const maxContentLen = 30000;
        const contentToSend =
          page.content.length > maxContentLen ? page.content.slice(0, maxContentLen) : page.content;

        const { data, error } = await supabase.functions.invoke("optimize-seo-content", {
          body: {
            website_id: websiteId,
            page_external_id: page.id,
            page_title: page.title,
            page_content: contentToSend,
            page_slug: page.slug,
            page_url: page.url,
            page_type: page.type,
            workspace_id: workspaceId,
            optimize_fields: ["seo_title", "seo_description", "seo_keywords", "content"],
            page_seo_title: page.seo_title,
            page_seo_description: page.seo_description || page.excerpt,
            page_seo_keywords: kw.length ? kw : page.seo_keywords || [],
            instruction,
          },
        });

        if (error) throw new Error(await extractEdgeError(error, "Optimization failed"));
        if (data?.error) throw new Error(data.error);

        nextResults[page.id] = {
          ok: true,
          pushed: Boolean(data?.pushed_to_cms),
          url: data?.external_url,
          error: data?.push_error || undefined,
        };
      } catch (err: any) {
        nextResults[page.id] = { ok: false, error: err.message };
      }
      setResults({ ...nextResults });
      setProgress({ done: i + 1, total: targets.length });
    }

    setOptimizing(false);
    const pushed = Object.values(nextResults).filter((r) => r.pushed).length;
    const failed = Object.values(nextResults).filter((r) => !r.ok).length;
    toast({
      title: `Republished ${pushed}/${targets.length} live pages`,
      description: failed ? `${failed} page(s) failed — check the list below.` : "Live site text updated using your scanned keywords.",
      variant: failed ? "destructive" : undefined,
    });
  };

  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">Update this live site with the scanned keywords</span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Fetch the live pages, then AI rewrites the SEO fields &amp; body text around your scanned
        keywords and republishes them to the same URLs — the design stays intact.
      </p>

      {!pages && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={loadingPages}
          onClick={loadPages}
        >
          {loadingPages ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Loading live pages…</>
          ) : (
            <><RefreshCw className="h-3.5 w-3.5 mr-2" /> Load live pages</>
          )}
        </Button>
      )}

      {pages && pages.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {selected.size} of {pages.length} selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[10px] text-primary hover:underline"
                onClick={() => setSelected(new Set(pages.map((p) => p.id)))}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:underline"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </button>
            </div>
          </div>

          <ScrollArea className="max-h-56 rounded-md border border-border/60 bg-background/60">
            <div className="divide-y divide-border/50">
              {pages.map((p) => {
                const r = results[p.id];
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggle(p.id)}
                      disabled={optimizing}
                    />
                    <span className="flex-1 truncate">{p.title || p.slug}</span>
                    {r?.ok && r.pushed && (
                      <Badge variant="outline" className="gap-1 text-[9px] text-emerald-600 border-emerald-500/40">
                        <CheckCircle2 className="h-3 w-3" /> Republished
                      </Badge>
                    )}
                    {r?.ok && !r.pushed && (
                      <Badge variant="outline" className="text-[9px]">Optimized</Badge>
                    )}
                    {r && !r.ok && (
                      <Badge variant="outline" className="gap-1 text-[9px] text-destructive border-destructive/40">
                        <XCircle className="h-3 w-3" /> Failed
                      </Badge>
                    )}
                    {r?.url && (
                      <a href={r.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    )}
                  </label>
                );
              })}
            </div>
          </ScrollArea>

          <Button
            size="sm"
            className="w-full"
            disabled={optimizing || selected.size === 0}
            onClick={optimizeSelected}
          >
            {optimizing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                Optimizing {progress?.done}/{progress?.total}…
              </>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-2" /> Optimize &amp; republish selected</>
            )}
          </Button>
        </>
      )}

      {pages && pages.length === 0 && (
        <p className="text-[10px] text-muted-foreground">No editable pages were returned for this site.</p>
      )}
    </div>
  );
}
