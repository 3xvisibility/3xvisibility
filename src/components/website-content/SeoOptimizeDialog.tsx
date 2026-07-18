import { useState, useMemo } from "react";
import { usePersistedSnapshot } from "@/hooks/use-persisted-state";
import { handleApiError } from "@/lib/handle-api-error";
import { extractEdgeError } from "@/lib/edge-function-error";
import {
  Sparkles,
  Loader2,
  Check,
  Copy,
  ArrowUpRight,
  Search,
  FileText,
  Type,
  RefreshCw,
  Undo2,

} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

import { supabase } from "@/integrations/supabase/client";
import { ScoresBadgeGroup } from "@/components/ScoresBadgeGroup";

interface ContentItem {
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

interface SeoOptimizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: ContentItem;
  websiteId: string;
  workspaceId: string | undefined;
  onOptimized?: () => void;
}

const FIELD_OPTIONS = [
  { id: "seo_title", label: "SEO Title", icon: <Type className="h-3.5 w-3.5" />, desc: "Optimized page title (30-60 chars)" },
  { id: "seo_description", label: "Meta Description", icon: <FileText className="h-3.5 w-3.5" />, desc: "Compelling meta description (120-160 chars)" },
  { id: "seo_keywords", label: "Keywords", icon: <Search className="h-3.5 w-3.5" />, desc: "5-8 relevant SEO keywords" },
  { id: "content", label: "Content Text", icon: <RefreshCw className="h-3.5 w-3.5" />, desc: "Rewrite text for SEO (keeps design intact)" },
];

export function SeoOptimizeDialog({
  open,
  onOpenChange,
  page,
  websiteId,
  workspaceId,
  onOptimized,
}: SeoOptimizeDialogProps) {
  const { toast } = useToast();
  const [selectedFields, setSelectedFields] = useState<string[]>(["seo_title", "seo_description", "seo_keywords", "content"]);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [autoRefreshAfterApply, setAutoRefreshAfterApply] = useState(true);
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const [forceRepublish, setForceRepublish] = useState(false);
  const [result, setResult] = useState<{
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
    content?: string;
    pushed_to_cms?: boolean;
    push_error?: string;
    external_url?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [rolledBack, setRolledBack] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<{
    ok: boolean;
    fetchedAt: string;
    live: { title: string; contentText: string; seoTitle?: string | null; seoDescription?: string | null };
    matches: { title: boolean; content: boolean; seoTitle: boolean; seoDescription: boolean };
    error?: string;
  } | null>(null);

  // Strip HTML → plain text for old-vs-new body preview (design HTML is huge
  // and unreadable in a side-by-side; text-only makes the diff easy to scan).
  const htmlToText = (html: string | null | undefined) =>
    (html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const oldBodyText = useMemo(() => htmlToText(page.content), [page.content]);
  const newBodyText = useMemo(() => htmlToText(result?.content), [result?.content]);

  const handleRollback = async () => {
    setRollingBack(true);
    try {
      const { data, error } = await supabase.functions.invoke("rollback-page", {
        body: { website_id: websiteId, page_external_id: page.id },
      });
      if (error) throw new Error(await extractEdgeError(error, "Rollback failed"));
      if (data?.error) throw new Error(data.error);
      setRolledBack(true);
      toast({
        title: "Reverted to previous version",
        description: "The earlier design and text were restored on your live website.",
      });
      onOptimized?.();
    } catch (err: any) {
      handleApiError(err, { title: "Rollback failed" });
    } finally {
      setRollingBack(false);
    }
  };

  // Persist field selection + instruction per page so users don't lose
  // their tweaks when navigating away.
  const seoSnapshot = useMemo(
    () => ({ selectedFields, instruction }),
    [selectedFields, instruction],
  );
  const clearSeoSnapshot = usePersistedSnapshot(
    `seo-optimize-dialog:${page.id}`,
    seoSnapshot,
    (s: any) => {
      if (!s || typeof s !== "object") return;
      if (Array.isArray(s.selectedFields) && s.selectedFields.length) {
        setSelectedFields(s.selectedFields);
      }
      if (typeof s.instruction === "string") setInstruction(s.instruction);
    },
    { version: 2 },
  );

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  // Phase 1: generate the AI preview WITHOUT pushing to the connected site.
  const runOptimize = async () => {
    if (selectedFields.length === 0) {
      toast({ title: "Select fields", description: "Pick at least one field to optimize", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);
    setApplied(false);
    setRolledBack(false);

    try {
      // Truncate content to avoid edge function timeouts on large pages
      const maxContentLen = 30000;
      const contentToSend = page.content.length > maxContentLen
        ? page.content.slice(0, maxContentLen)
        : page.content;

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
          optimize_fields: selectedFields,
          page_seo_title: page.seo_title,
          page_seo_description: page.seo_description || page.excerpt,
          page_seo_keywords: page.seo_keywords || [],
          instruction: instruction || undefined,
          // Preview only — do NOT push to CMS yet. The user reviews the diff
          // and clicks "Apply to site" to actually update the live page.
          skip_push: true,
          overwrite_design: selectedFields.includes("content"),
        },
      });

      if (error) throw new Error(await extractEdgeError(error, "Optimization failed"));
      if (data?.error) throw new Error(data.error);

      setResult({
        ...data.result,
        pushed_to_cms: false,
      });

      toast({
        title: "Preview ready",
        description: "Review the old vs new changes below, then click \"Apply to site\".",
      });
    } catch (err: any) {
      handleApiError(err, { title: "Optimization failed" });
    } finally {
      setLoading(false);
    }
  };

  // Phase 2: push the previewed values to the connected site.
  const applyToSite = async () => {
    if (!result) return;
    setApplying(true);
    setApplyError(null);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-seo-content", {
        body: {
          website_id: websiteId,
          page_external_id: page.id,
          page_title: page.title,
          page_slug: page.slug,
          page_url: page.url,
          page_type: page.type,
          workspace_id: workspaceId,
          manual_update: true,
          // Preserve the actual live-page name — only body/SEO fields change.
          manual_title: page.title,
          manual_content: result.content || page.content,
          seo_title: result.seo_title,
          seo_description: result.seo_description,
          seo_keywords: result.seo_keywords,
          // We just previewed a full rewrite — publish it as-is and also
          // propagate the changes to the linked template + campaign row so
          // any future page generated from the same template inherits the fix.
          overwrite_design: true,
          update_template: true,
          force_republish: forceRepublish,
        },
      });

      if (error) throw new Error(await extractEdgeError(error, "Apply failed"));
      if (data?.error) throw new Error(data.error);

      const liveUrl: string | undefined = data.external_url || page.url;
      const updatedFields = [
        selectedFields.includes("title") && "title",
        selectedFields.includes("content") && "content",
        selectedFields.includes("seo_title") && "SEO title",
        selectedFields.includes("seo_description") && "meta description",
      ].filter(Boolean) as string[];

      setResult((prev) => prev && {
        ...prev,
        pushed_to_cms: !!data.pushed_to_cms,
        push_error: data.push_error || undefined,
        external_url: data.external_url,
      });
      setApplied(true);

      toast({
        title: data.pushed_to_cms ? "✓ Applied to your site" : "Saved",
        description: data.pushed_to_cms
          ? `Updated ${updatedFields.join(", ") || "page"} on the same URL${liveUrl ? ` — ${liveUrl}` : ""}.`
          : data.push_error || "Changes were saved locally.",
        variant: data.push_error ? "destructive" : undefined,
        action: data.pushed_to_cms && liveUrl
          ? (
              <ToastAction altText="Open live page" onClick={() => window.open(liveUrl, "_blank", "noopener,noreferrer")}>
                Open page
              </ToastAction>
            )
          : undefined,
      });


      onOptimized?.();

      // Auto-refresh: regenerate SEO fields grounded on the just-applied body
      // and push them straight back so the live page's title/description/
      // keywords match the newly published content length targets.
      if (
        autoRefreshAfterApply &&
        data.pushed_to_cms &&
        result.content &&
        selectedFields.includes("content")
      ) {
        await autoRefreshSeoOnLive(result.content);
      }

      // After everything is pushed, re-fetch from the live site and verify
      // the update actually landed on the published page.
      if (data.pushed_to_cms) {
        await verifyLive();
      }
    } catch (err: any) {
      const message = err?.message || String(err);
      setApplyError(message);
      handleApiError(err, { title: "Apply failed" });
    } finally {
      setApplying(false);
    }
  };

  // Retry-aware wrapper for transient WordPress failures. Uses exponential
  // backoff on the client too so we don't hammer a struggling host.
  const retryApply = async () => {
    const next = retryAttempt + 1;
    setRetryAttempt(next);
    const delay = Math.min(1000 * Math.pow(2, next - 1), 8000);
    await new Promise((r) => setTimeout(r, delay));
    await applyToSite();
  };


  // Re-fetch the page from the connected site and compare it against the
  // values we just pushed, so the user can be sure the changes are live.
  const verifyLive = async () => {
    setVerifying(true);
    setVerification(null);
    try {
      const contentType = page.type === "product" ? "products" : "pages";
      // Small delay so the CMS has a moment to flush caches before re-reading.
      await new Promise((r) => setTimeout(r, 1500));
      const { data, error } = await supabase.functions.invoke("fetch-site-content", {
        body: { website_id: websiteId, content_type: contentType },
      });
      if (error) throw new Error(await extractEdgeError(error, "Verification failed"));
      if (data?.error && !data.items?.length) throw new Error(data.error);

      const items: any[] = Array.isArray(data?.items) ? data.items : [];
      const fresh =
        items.find((i) => String(i.id) === String(page.id)) ||
        items.find((i) => i.slug && i.slug === page.slug) ||
        items.find((i) => i.url && page.url && i.url === page.url);

      if (!fresh) {
        setVerification({
          ok: false,
          fetchedAt: new Date().toISOString(),
          live: { title: "", contentText: "" },
          matches: { title: false, content: false, seoTitle: false, seoDescription: false },
          error: "Could not find this page on the live site after refresh.",
        });
        return;
      }

      const liveTitle = String(fresh.title || "");
      const liveContentText = htmlToText(fresh.content || "");
      const liveSeoTitle: string | null | undefined = fresh.seo_title;
      const liveSeoDesc: string | null | undefined = fresh.seo_description;

      const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
      const contains = (hay: string, needle: string) => {
        if (!needle) return true;
        const h = norm(hay);
        const n = norm(needle);
        if (!n) return true;
        // For long bodies, look for a healthy chunk of the pushed text.
        const probe = n.length > 120 ? n.slice(0, 120) : n;
        return h.includes(probe);
      };

      const expectedContentText = htmlToText(result?.content || page.content);
      const matches = {
        title: contains(liveTitle, page.title),
        content: contains(liveContentText, expectedContentText),
        seoTitle: result?.seo_title ? contains(String(liveSeoTitle || ""), result.seo_title) : true,
        seoDescription: result?.seo_description ? contains(String(liveSeoDesc || ""), result.seo_description) : true,
      };
      const ok = matches.title && matches.content && matches.seoTitle && matches.seoDescription;

      setVerification({
        ok,
        fetchedAt: new Date().toISOString(),
        live: { title: liveTitle, contentText: liveContentText, seoTitle: liveSeoTitle, seoDescription: liveSeoDesc },
        matches,
      });

      toast({
        title: ok ? "Verified on live site" : "Live page differs",
        description: ok
          ? "The published page now reflects your changes."
          : "We refetched the page but some fields don't match yet — the CMS may still be caching.",
        variant: ok ? undefined : "destructive",
      });
    } catch (err: any) {
      setVerification({
        ok: false,
        fetchedAt: new Date().toISOString(),
        live: { title: "", contentText: "" },
        matches: { title: false, content: false, seoTitle: false, seoDescription: false },
        error: err?.message || "Verification failed",
      });
    } finally {
      setVerifying(false);
    }
  };


  // Regenerate SEO from the freshly published body, then push SEO-only back
  // to the live page (no body rewrite) so the layout stays intact.
  const autoRefreshSeoOnLive = async (publishedContent: string) => {
    setAutoRefreshing(true);
    try {
      const maxContentLen = 30000;
      const contentToSend = publishedContent.length > maxContentLen
        ? publishedContent.slice(0, maxContentLen)
        : publishedContent;

      const oldTitleLen = (page.seo_title || page.title || "").length;
      const oldDescLen = (page.seo_description || page.excerpt || "").length;
      const lengthHint = [
        oldTitleLen ? `SEO title ≈ ${oldTitleLen} chars (±10%)` : null,
        oldDescLen ? `Meta description ≈ ${oldDescLen} chars (±10%)` : null,
        "Match the original title, subtitle, and paragraph length targets so the page layout stays intact.",
      ].filter(Boolean).join(". ");

      // 1) regenerate SEO fields from the applied body (preview only)
      const { data: regen, error: regenErr } = await supabase.functions.invoke("optimize-seo-content", {
        body: {
          website_id: websiteId,
          page_external_id: page.id,
          page_title: page.title,
          page_content: contentToSend,
          page_slug: page.slug,
          page_url: page.url,
          page_type: page.type,
          workspace_id: workspaceId,
          optimize_fields: ["seo_title", "seo_description", "seo_keywords"],
          page_seo_title: result?.seo_title || page.seo_title,
          page_seo_description: result?.seo_description || page.seo_description || page.excerpt,
          page_seo_keywords: result?.seo_keywords || page.seo_keywords || [],
          instruction: [instruction, lengthHint].filter(Boolean).join(" — "),
          skip_push: true,
          overwrite_design: false,
        },
      });
      if (regenErr) throw new Error(await extractEdgeError(regenErr, "Auto-refresh failed"));
      if (regen?.error) throw new Error(regen.error);

      const refreshed = {
        seo_title: regen?.result?.seo_title,
        seo_description: regen?.result?.seo_description,
        seo_keywords: regen?.result?.seo_keywords,
      };

      // 2) push SEO-only update to CMS (no body change)
      const { data: pushRes, error: pushErr } = await supabase.functions.invoke("optimize-seo-content", {
        body: {
          website_id: websiteId,
          page_external_id: page.id,
          page_title: page.title,
          page_slug: page.slug,
          page_url: page.url,
          page_type: page.type,
          workspace_id: workspaceId,
          manual_update: true,
          manual_title: page.title,
          manual_content: publishedContent,
          seo_title: refreshed.seo_title,
          seo_description: refreshed.seo_description,
          seo_keywords: refreshed.seo_keywords,
          overwrite_design: false,
        },
      });
      if (pushErr) throw new Error(await extractEdgeError(pushErr, "Auto-refresh push failed"));
      if (pushRes?.error) throw new Error(pushRes.error);

      setResult((prev) => prev && {
        ...prev,
        seo_title: refreshed.seo_title ?? prev.seo_title,
        seo_description: refreshed.seo_description ?? prev.seo_description,
        seo_keywords: refreshed.seo_keywords ?? prev.seo_keywords,
        pushed_to_cms: !!pushRes?.pushed_to_cms || prev.pushed_to_cms,
      });

      toast({
        title: "SEO auto-refreshed on live site",
        description: "Title, description, and keywords now match the newly published content.",
      });
      onOptimized?.();
    } catch (err: any) {
      handleApiError(err, { title: "Auto-refresh failed" });
    } finally {
      setAutoRefreshing(false);
    }
  };

  // One-click: regenerate SEO title/description/keywords grounded on the
  // freshly previewed body content, keeping the original length targets so
  // the layout still fits (title, subtitle, paragraph slots).
  const regenerateSeoFromNewContent = async () => {
    if (!result?.content) return;
    setRegenerating(true);
    try {
      const maxContentLen = 30000;
      const contentToSend = result.content.length > maxContentLen
        ? result.content.slice(0, maxContentLen)
        : result.content;

      const oldTitleLen = (page.seo_title || page.title || "").length;
      const oldDescLen = (page.seo_description || page.excerpt || "").length;
      const lengthHint = [
        oldTitleLen ? `SEO title ≈ ${oldTitleLen} chars (±10%)` : null,
        oldDescLen ? `Meta description ≈ ${oldDescLen} chars (±10%)` : null,
        "Match the original title, subtitle, and paragraph length targets so the page layout stays intact.",
      ].filter(Boolean).join(". ");

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
          // SEO fields only — do NOT touch the newly generated body.
          optimize_fields: ["seo_title", "seo_description", "seo_keywords"],
          page_seo_title: page.seo_title,
          page_seo_description: page.seo_description || page.excerpt,
          page_seo_keywords: page.seo_keywords || [],
          instruction: [instruction, lengthHint].filter(Boolean).join(" — "),
          skip_push: true,
          overwrite_design: false,
        },
      });

      if (error) throw new Error(await extractEdgeError(error, "Regenerate failed"));
      if (data?.error) throw new Error(data.error);

      setResult((prev) => prev && {
        ...prev,
        seo_title: data.result?.seo_title ?? prev.seo_title,
        seo_description: data.result?.seo_description ?? prev.seo_description,
        seo_keywords: data.result?.seo_keywords ?? prev.seo_keywords,
      });

      toast({
        title: "SEO fields regenerated",
        description: "Title, description, and keywords updated from the new content.",
      });
    } catch (err: any) {
      handleApiError(err, { title: "Regenerate failed" });
    } finally {
      setRegenerating(false);
    }
  };

  const copyAll = () => {
    if (!result) return;
    const text = [
      result.seo_title && `Title: ${result.seo_title}`,
      result.seo_description && `Description: ${result.seo_description}`,
      result.seo_keywords?.length && `Keywords: ${result.seo_keywords.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setResult(null); setApplied(false); setInstruction(""); setVerification(null); clearSeoSnapshot(); } }}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Optimize SEO
          </DialogTitle>
          <DialogDescription className="truncate">
            AI will optimize "{page.title?.slice(0, 50)}" and update it on your website
          </DialogDescription>
        </DialogHeader>

        {/* Current scores */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">Current:</span>
          <ScoresBadgeGroup
            title={page.title}
            content={page.content}
            slug={page.slug}
            url={page.url}
            description={page.seo_description || page.excerpt}
            seoTitle={page.seo_title}
            seoKeywords={page.seo_keywords}
            size="sm"
            showLabels
          />
        </div>

        {/* Field selection */}
        <div className="space-y-2">
          <p className="text-sm font-medium">What to optimize:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FIELD_OPTIONS.map((f) => (
              <label
                key={f.id}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selectedFields.includes(f.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <Checkbox
                  checked={selectedFields.includes(f.id)}
                  onCheckedChange={() => toggleField(f.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {f.icon}
                    <span className="text-sm font-medium">{f.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Optional instruction */}
        <Textarea
          placeholder="Optional: Add specific instructions (e.g., 'Focus on premium product buyers', 'Target keyword: red button')..."
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          className="h-16 text-sm"
        />

        {/* Action button */}
        <Button onClick={runOptimize} disabled={loading || applying || selectedFields.length === 0} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Generating preview..." : result ? "Regenerate preview" : "Preview changes"}
        </Button>

        {/* Preview / Results */}
        {result && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium">
                  {applied ? "Applied" : "Preview — old vs new"}
                </p>
                {!applied && !result.pushed_to_cms && (
                  <Badge variant="secondary" className="text-[10px]">
                    Not yet applied
                  </Badge>
                )}
                {result.pushed_to_cms && (
                  <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <Check className="h-3 w-3 mr-1" /> Updated on site (same URL)
                  </Badge>
                )}
                {result.push_error && (
                  <Badge variant="destructive" className="text-[10px]">
                    Update failed: {result.push_error}
                  </Badge>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={copyAll} className="gap-1.5 h-7 text-xs">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            {/* SEO Title diff */}
            {result.seo_title && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">SEO Title</span>
                  <Badge
                    variant={result.seo_title.length >= 30 && result.seo_title.length <= 60 ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {result.seo_title.length} chars
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded border border-destructive/30 bg-destructive/5 p-2">
                    <span className="text-[10px] uppercase tracking-wide text-destructive/80 block mb-1">Old</span>
                    <p className="text-xs break-words">{page.seo_title || <span className="italic text-muted-foreground">(none)</span>}</p>
                  </div>
                  <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
                    <span className="text-[10px] uppercase tracking-wide text-emerald-600 block mb-1">New</span>
                    <p className="text-xs font-medium break-words">{result.seo_title}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Meta Description diff */}
            {result.seo_description && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Meta Description</span>
                  <Badge
                    variant={result.seo_description.length >= 120 && result.seo_description.length <= 160 ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {result.seo_description.length} chars
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded border border-destructive/30 bg-destructive/5 p-2">
                    <span className="text-[10px] uppercase tracking-wide text-destructive/80 block mb-1">Old</span>
                    <p className="text-xs break-words">
                      {page.seo_description || page.excerpt || <span className="italic text-muted-foreground">(none)</span>}
                    </p>
                  </div>
                  <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
                    <span className="text-[10px] uppercase tracking-wide text-emerald-600 block mb-1">New</span>
                    <p className="text-xs break-words">{result.seo_description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Keywords diff */}
            {result.seo_keywords && result.seo_keywords.length > 0 && (
              <div className="rounded-md border p-3 space-y-2">
                <span className="text-xs font-medium text-muted-foreground block">Keywords</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded border border-destructive/30 bg-destructive/5 p-2">
                    <span className="text-[10px] uppercase tracking-wide text-destructive/80 block mb-1">Old</span>
                    <div className="flex flex-wrap gap-1">
                      {(page.seo_keywords && page.seo_keywords.length > 0)
                        ? page.seo_keywords.map((kw) => (
                            <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>
                          ))
                        : <span className="text-xs italic text-muted-foreground">(none)</span>}
                    </div>
                  </div>
                  <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
                    <span className="text-[10px] uppercase tracking-wide text-emerald-600 block mb-1">New</span>
                    <div className="flex flex-wrap gap-1">
                      {result.seo_keywords.map((kw) => (
                        <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Body text diff (plain-text side-by-side — design HTML stays intact on apply) */}
            {result.content && (
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Body Content</span>
                  <span className="text-[10px] text-muted-foreground">
                    {oldBodyText.length} → {newBodyText.length} chars
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded border border-destructive/30 bg-destructive/5 p-2">
                    <span className="text-[10px] uppercase tracking-wide text-destructive/80 block mb-1">Old</span>
                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap break-words max-h-56 overflow-y-auto">
                      {oldBodyText || <span className="italic text-muted-foreground">(empty)</span>}
                    </p>
                  </div>
                  <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2">
                    <span className="text-[10px] uppercase tracking-wide text-emerald-600 block mb-1">New</span>
                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap break-words max-h-56 overflow-y-auto">
                      {newBodyText}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Retryable transient failure banner (WordPress hosting hiccups) */}
            {(() => {
              const raw = applyError || result.push_error || "";
              const isRetryable = /\[retryable\]/i.test(raw)
                || /timed out|temporarily unavailable|rate.?limit|502|503|504|econn|network|fetch failed/i.test(raw);
              if (!raw || !isRetryable) return null;
              const friendly = raw.replace(/^\s*\[retryable\]\s*/i, "").trim();
              return (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <RefreshCw className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground">
                        Temporary WordPress issue — safe to retry
                      </p>
                      <p className="text-[11px] text-muted-foreground break-words">{friendly}</p>
                      {retryAttempt > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Retried {retryAttempt}× with backoff. Nothing else was changed on your site.
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={retryApply}
                      disabled={applying || regenerating || autoRefreshing}
                      className="gap-1.5 text-xs shrink-0"
                    >
                      {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      {applying ? "Retrying…" : "Retry"}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Apply / discard */}
            {!applied && (
              <>
                {result.content && selectedFields.includes("content") && (
                  <label className="flex items-start gap-2 text-xs text-muted-foreground rounded-md border border-dashed p-2 cursor-pointer hover:bg-muted/40">
                    <Checkbox
                      checked={autoRefreshAfterApply}
                      onCheckedChange={(v) => setAutoRefreshAfterApply(v === true)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-foreground">Auto-refresh SEO after apply</span>
                      <br />
                      After pushing the new content, regenerate the SEO title, description, and keywords from the just-published body (keeping the original length targets) and push them back to the live page.
                    </span>
                  </label>
                )}
                <label className="flex items-start gap-2 text-xs text-muted-foreground rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 p-2 cursor-pointer hover:bg-amber-500/10">
                  <Checkbox
                    checked={forceRepublish}
                    onCheckedChange={(v) => setForceRepublish(v === true)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-foreground">Force republish (clear Elementor edit-mode)</span>
                    <br />
                    Use this when content updates don't show on the live page. Clears <code className="text-[10px]">_elementor_edit_mode</code> and <code className="text-[10px]">_elementor_data</code> so the pushed HTML actually renders at the same URL. The Elementor editor will need to re-import the layout after.
                  </span>
                </label>
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  {result.content && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={regenerateSeoFromNewContent}
                      disabled={applying || regenerating || loading || autoRefreshing}
                      className="gap-1.5 text-xs mr-auto"
                      title="Regenerate SEO title, description, and keywords from the new body content, keeping original length targets."
                    >
                      {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      {regenerating ? "Regenerating..." : "Regenerate SEO from new content"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setResult(null)}
                    disabled={applying || regenerating || autoRefreshing}
                    className="text-xs"
                  >
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    onClick={applyToSite}
                    disabled={applying || regenerating || autoRefreshing}
                    className="gap-1.5 text-xs"
                  >
                    {applying || autoRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {applying
                      ? "Applying..."
                      : autoRefreshing
                        ? "Refreshing SEO..."
                        : autoRefreshAfterApply && result.content && selectedFields.includes("content")
                          ? "Apply & auto-refresh SEO"
                          : "Apply to site"}
                  </Button>
                </div>
              </>
            )}


            {/* Live verification — refetch published page and compare */}
            {applied && result.pushed_to_cms && (verifying || verification) && (
              <div className={`rounded-md border p-3 space-y-2 ${
                verifying
                  ? "border-border bg-muted/40"
                  : verification?.ok
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/40 bg-amber-500/5"
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    {verifying ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying live page…</>
                    ) : verification?.ok ? (
                      <><Check className="h-3.5 w-3.5 text-emerald-600" /> Verified on live site</>
                    ) : (
                      <><RefreshCw className="h-3.5 w-3.5 text-amber-600" /> Live page differs</>
                    )}
                  </p>
                  {!verifying && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={verifyLive}
                      className="h-6 text-[11px] gap-1"
                    >
                      <RefreshCw className="h-3 w-3" /> Recheck
                    </Button>
                  )}
                </div>

                {verifying && (
                  <p className="text-[11px] text-muted-foreground">
                    Refetching the page from your site to confirm the changes are live…
                  </p>
                )}

                {!verifying && verification && (
                  <>
                    {verification.error && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">{verification.error}</p>
                    )}
                    <ul className="text-[11px] space-y-1">
                      {(["title", "content", "seoTitle", "seoDescription"] as const).map((k) => (
                        <li key={k} className="flex items-center gap-2">
                          {verification.matches[k] ? (
                            <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="h-3 w-3 rounded-full border border-amber-500 shrink-0" />
                          )}
                          <span className="capitalize text-muted-foreground">
                            {k === "seoTitle" ? "SEO title" : k === "seoDescription" ? "Meta description" : k}
                          </span>
                          <span className={verification.matches[k] ? "text-emerald-600" : "text-amber-600"}>
                            {verification.matches[k] ? "updated on live" : "not detected yet"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {verification.live.title && (
                      <div className="rounded border border-border bg-background/60 p-2 mt-1 space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Live now</p>
                        <p className="text-[11px] font-medium truncate">{verification.live.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-3">
                          {verification.live.contentText || <span className="italic">(empty body)</span>}
                        </p>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Fetched {new Date(verification.fetchedAt).toLocaleTimeString()}. If fields still show "not detected yet", your CMS/CDN may be caching — wait a moment and click Recheck.
                    </p>
                  </>
                )}
              </div>
            )}


            {/* Rollback — only relevant after we actually pushed */}
            {applied && result.pushed_to_cms && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-amber-600">Don't like the result?</p>
                  <p className="text-[11px] text-muted-foreground">
                    Preview the live page, then restore the previous design & text in one click.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRollback}
                  disabled={rollingBack || rolledBack}
                  className="gap-1.5 h-8 text-xs shrink-0 text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
                >
                  {rollingBack ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : rolledBack ? <Check className="h-3.5 w-3.5" /> : <Undo2 className="h-3.5 w-3.5" />}
                  {rollingBack ? "Reverting..." : rolledBack ? "Reverted" : "Rollback"}
                </Button>
              </div>
            )}

            {result.external_url && applied && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => window.open(result.external_url, "_blank")}
              >
                <ArrowUpRight className="h-3.5 w-3.5" /> View Updated Page
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
