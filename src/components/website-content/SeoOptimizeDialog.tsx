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
          // We just previewed a full rewrite — publish it as-is.
          overwrite_design: true,
        },
      });

      if (error) throw new Error(await extractEdgeError(error, "Apply failed"));
      if (data?.error) throw new Error(data.error);

      setResult((prev) => prev && {
        ...prev,
        pushed_to_cms: !!data.pushed_to_cms,
        push_error: data.push_error || undefined,
        external_url: data.external_url,
      });
      setApplied(true);

      toast({
        title: data.pushed_to_cms ? "Applied to your site" : "Saved",
        description: data.pushed_to_cms
          ? "Existing page updated — same URL, no new page created."
          : data.push_error || "Changes were saved locally.",
        variant: data.push_error ? "destructive" : undefined,
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
    } catch (err: any) {
      handleApiError(err, { title: "Apply failed" });
    } finally {
      setApplying(false);
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
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setResult(null); setApplied(false); setInstruction(""); clearSeoSnapshot(); } }}>
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

            {/* Apply / discard */}
            {!applied && (
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {result.content && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={regenerateSeoFromNewContent}
                    disabled={applying || regenerating || loading}
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
                  disabled={applying || regenerating}
                  className="text-xs"
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  onClick={applyToSite}
                  disabled={applying || regenerating}
                  className="gap-1.5 text-xs"
                >
                  {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {applying ? "Applying..." : "Apply to site"}
                </Button>
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
