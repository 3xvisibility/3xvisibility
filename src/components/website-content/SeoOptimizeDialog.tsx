import { useState, useMemo, useEffect, useRef } from "react";
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

/**
 * Explain why a field didn't match on the live page and offer concrete fixes.
 * Runs on the client with only the compared strings + a few UI hints.
 */
function diagnoseFieldMismatch(
  field: "title" | "content" | "seoTitle" | "seoDescription",
  expected: string,
  live: string,
  ctx: { forceRepublish: boolean; attempts: number; hasElementorHint: boolean }
): { cause: string; fixes: string[] } {
  const exp = (expected || "").trim();
  const liv = (live || "").trim();
  const label = field === "seoTitle" ? "SEO title" : field === "seoDescription" ? "meta description" : field;

  // Nothing pushed for this field
  if (!exp) {
    return {
      cause: `No new ${label} was generated, so there's nothing to verify on the live page yet.`,
      fixes: [
        `Enable "${label}" in the Optimize options and re-run to generate a new value.`,
      ],
    };
  }

  // Field is completely empty on the live page
  if (!liv) {
    if (field === "seoTitle" || field === "seoDescription") {
      return {
        cause: `The live page didn't expose a ${label} tag — your SEO plugin (Yoast / Rank Math / AIOSEO) may not be storing this field, or it's using a different meta key.`,
        fixes: [
          "Make sure Yoast / Rank Math / AIOSEO is active on the site.",
          "Open the page in WordPress admin and confirm the SEO plugin panel shows your value.",
          "If you use a custom SEO plugin, ensure it writes the standard `<meta name=\"description\">` / `<title>` tags.",
        ],
      };
    }
    return {
      cause: `The live page returned an empty ${label}. Publish may have partially failed, or a caching layer is still serving the old shell.`,
      fixes: [
        "Toggle Force republish ON and click Apply again.",
        "Clear your CDN/site cache (Cloudflare, WP Rocket, LiteSpeed, W3 Total Cache).",
        "Confirm the page status is Published (not Draft) in WordPress.",
      ],
    };
  }

  // Elementor / builder cache
  if ((field === "content" || field === "title") && ctx.hasElementorHint) {
    return {
      cause: "The live page is still rendering from Elementor's cached data — Elementor stores the design in `_elementor_data` and ignores HTML updates until that cache is cleared.",
      fixes: [
        "Turn ON Force republish and click Apply — it clears `_elementor_edit_mode` and `_elementor_data`.",
        "In WordPress: Elementor → Tools → Regenerate CSS & Data.",
        "As a last resort, open the page in Elementor editor and click Update once.",
      ],
    };
  }

  // Live still equals the old value (approximate: none of the expected words are present)
  const expTokens = exp.toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 8);
  const overlap = expTokens.filter((w) => liv.toLowerCase().includes(w)).length;
  if (expTokens.length > 0 && overlap === 0) {
    return {
      cause: `The live ${label} still shows the old value — the update reached WordPress but a cache layer (CDN, page cache, or browser) is serving a stale copy.`,
      fixes: [
        "Purge your CDN cache: Cloudflare → Caching → Purge Everything (or purge the single URL).",
        "Clear the WordPress page cache (WP Rocket, LiteSpeed, W3 Total Cache, WP Super Cache).",
        "If using Cloudflare, temporarily enable Development Mode for 3 hours.",
        ctx.attempts >= 5
          ? "Verification retried 5× already — the cache TTL is longer than 60s. Wait a few minutes and click Recheck."
          : "Wait 30–60 seconds and click Recheck — auto-verify will keep polling.",
      ],
    };
  }

  // Partial match — content is close but not identical
  return {
    cause: `The live ${label} partially matches what we pushed. This usually means a theme/plugin is post-processing the content (auto-excerpts, shortcode expansion, or a canonical SEO plugin overriding the field).`,
    fixes: [
      field === "seoTitle" || field === "seoDescription"
        ? "Check that only ONE SEO plugin is active — multiple plugins (Yoast + Rank Math) overwrite each other."
        : "Disable content filters like Jetpack \"Related Posts\" or auto-excerpt plugins temporarily and retry.",
      "Open the page URL in an incognito window to bypass your browser cache.",
      !ctx.forceRepublish ? "Turn ON Force republish and click Apply again." : "Try clearing the site cache — Force republish is already ON.",
    ],
  };
}



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
  const [purgeAfterApply, setPurgeAfterApply] = useState(true);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{
    success: boolean;
    purged_plugins: string[];
    detected_plugins: string[];
    total_attempts: number;
    note?: string;
    at: string;
  } | null>(null);
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
  const [verifyAttempt, setVerifyAttempt] = useState(0);
  const [showVerifyDiff, setShowVerifyDiff] = useState(false);
  const [showFieldChanges, setShowFieldChanges] = useState(true);

  // Pre-apply live snapshot — captured right before we push to WordPress so we
  // can show a before/after diff of what actually changed on the live page
  // after Force republish (title, content, SEO title, meta description).
  const [preApplySnapshot, setPreApplySnapshot] = useState<{
    title: string;
    contentText: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
    fetchedAt: string;
  } | null>(null);

  // Auto-republish: when verification finds the live page still matches the
  // pre-apply (old) snapshot, we retrigger Apply with Force republish up to
  // MAX_AUTO_REPUBLISH times before giving up and asking the user to retry.
  const MAX_AUTO_REPUBLISH = 2;
  const autoRepublishRef = useRef(0);
  const [autoRepublishAttempt, setAutoRepublishAttempt] = useState(0);
  const [autoRepublishing, setAutoRepublishing] = useState(false);

  const VERIFY_MAX_ATTEMPTS = 5;
  const VERIFY_DELAYS_MS = [1500, 4000, 8000, 15000, 30000];

  const [verification, setVerification] = useState<{
    ok: boolean;
    fetchedAt: string;
    live: { title: string; contentText: string; seoTitle?: string | null; seoDescription?: string | null };
    matches: { title: boolean; content: boolean; seoTitle: boolean; seoDescription: boolean };
    error?: string;
  } | null>(null);

  // Prior verification runs pulled from the DB for this page — surfaced at the
  // top of the dialog so users can see when each field was last confirmed live.
  type PastVerification = {
    id: string;
    created_at: string;
    verified_all: boolean;
    force_republish: boolean;
    attempts: number;
    page_url: string | null;
    matches: { title?: boolean; content?: boolean; seoTitle?: boolean; seoDescription?: boolean };
    error: string | null;
  };
  const [pastVerifications, setPastVerifications] = useState<PastVerification[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Persist a single verification snapshot to Postgres. Best-effort — a failure
  // here should never break the Apply/verify flow, so we swallow the error.
  const persistVerification = async (snapshot: {
    ok: boolean;
    attempts: number;
    live: { title: string; contentText: string; seoTitle?: string | null; seoDescription?: string | null };
    matches: { title: boolean; content: boolean; seoTitle: boolean; seoDescription: boolean };
    error?: string;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid || !workspaceId) return;
      await supabase.from("seo_apply_verifications").insert({
        user_id: uid,
        workspace_id: workspaceId,
        website_id: websiteId ?? null,
        page_id: String(page.id),
        page_slug: page.slug ?? null,
        page_url: result?.external_url || page.url || null,
        page_type: page.type ?? null,
        expected: {
          title: page.title || "",
          seo_title: result?.seo_title || "",
          seo_description: result?.seo_description || "",
          content_preview: htmlToText(result?.content || page.content).slice(0, 500),
        },
        live: {
          title: snapshot.live.title,
          seo_title: snapshot.live.seoTitle ?? null,
          seo_description: snapshot.live.seoDescription ?? null,
          content_preview: (snapshot.live.contentText || "").slice(0, 500),
        },
        matches: snapshot.matches,
        attempts: snapshot.attempts,
        verified_all: snapshot.ok,
        force_republish: forceRepublish,
        error: snapshot.error ?? null,
      });
    } catch {
      // silent — history is a nice-to-have
    }
  };

  // Load past verification runs when the dialog opens so users can see the
  // last known state for each field on the live site.
  useEffect(() => {
    if (!open || !workspaceId || !page?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("seo_apply_verifications")
        .select("id, created_at, verified_all, force_republish, attempts, page_url, matches, error")
        .eq("workspace_id", workspaceId)
        .eq("page_id", String(page.id))
        .order("created_at", { ascending: false })
        .limit(10);
      if (cancelled || error) return;
      setPastVerifications((data || []) as PastVerification[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workspaceId, page?.id]);

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

  // Lightweight word-level diff. Returns segments with a status per token so
  // the verification panel can highlight what's missing/extra on the live page.
  const wordDiff = (expected: string, live: string) => {
    const a = (expected || "").split(/(\s+)/).filter((t) => t.length);
    const b = (live || "").split(/(\s+)/).filter((t) => t.length);
    const n = a.length, m = b.length;
    // LCS table (small strings only; cap tokens to keep it cheap)
    const cap = 400;
    const aa = a.slice(0, cap);
    const bb = b.slice(0, cap);
    const N = aa.length, M = bb.length;
    const dp: number[][] = Array.from({ length: N + 1 }, () => new Array(M + 1).fill(0));
    for (let i = N - 1; i >= 0; i--)
      for (let j = M - 1; j >= 0; j--)
        dp[i][j] = aa[i] === bb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const expSeg: { t: string; s: "same" | "missing" }[] = [];
    const liveSeg: { t: string; s: "same" | "extra" }[] = [];
    let i = 0, j = 0;
    while (i < N && j < M) {
      if (aa[i] === bb[j]) { expSeg.push({ t: aa[i], s: "same" }); liveSeg.push({ t: bb[j], s: "same" }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { expSeg.push({ t: aa[i], s: "missing" }); i++; }
      else { liveSeg.push({ t: bb[j], s: "extra" }); j++; }
    }
    while (i < N) { expSeg.push({ t: aa[i++], s: "missing" }); }
    while (j < M) { liveSeg.push({ t: bb[j++], s: "extra" }); }
    if (n > cap) expSeg.push({ t: ` …(+${n - cap} more)`, s: "same" });
    if (m > cap) liveSeg.push({ t: ` …(+${m - cap} more)`, s: "same" });
    return { expSeg, liveSeg };
  };

  const DiffText = ({ expected, live }: { expected: string; live: string }) => {
    const { expSeg, liveSeg } = wordDiff(expected || "", live || "");
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="rounded border border-border bg-background/60 p-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">You pushed</p>
          <p className="text-[11px] leading-relaxed break-words">
            {expSeg.map((s, i) => (
              <span key={i} className={s.s === "missing" ? "bg-amber-500/25 text-amber-800 dark:text-amber-200 rounded px-0.5" : ""}>{s.t}</span>
            ))}
            {!expected && <span className="italic text-muted-foreground">(empty)</span>}
          </p>
        </div>
        <div className="rounded border border-border bg-background/60 p-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Live now</p>
          <p className="text-[11px] leading-relaxed break-words">
            {liveSeg.map((s, i) => (
              <span key={i} className={s.s === "extra" ? "bg-sky-500/20 text-sky-800 dark:text-sky-200 rounded px-0.5" : ""}>{s.t}</span>
            ))}
            {!live && <span className="italic text-muted-foreground">(empty)</span>}
          </p>
        </div>
      </div>
    );
  };


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

  // Fetch the current live values from the connected site without touching
  // the post-apply verification state. Used to snapshot the "before" values
  // right before we push, so we can diff what actually changed on the live
  // page after Force republish.
  const fetchLiveSnapshot = async (): Promise<{
    title: string;
    contentText: string;
    seoTitle?: string | null;
    seoDescription?: string | null;
  } | null> => {
    try {
      const contentType = page.type === "product" ? "products" : "pages";
      const { data, error } = await supabase.functions.invoke("fetch-site-content", {
        body: { website_id: websiteId, content_type: contentType },
      });
      if (error || !data) return null;
      const items: any[] = Array.isArray(data?.items) ? data.items : [];
      const fresh =
        items.find((i) => String(i.id) === String(page.id)) ||
        items.find((i) => i.slug && i.slug === page.slug) ||
        items.find((i) => i.url && page.url && i.url === page.url);
      if (!fresh) return null;
      return {
        title: String(fresh.title || ""),
        contentText: htmlToText(fresh.content || ""),
        seoTitle: fresh.seo_title ?? null,
        seoDescription: fresh.seo_description ?? null,
      };
    } catch {
      return null;
    }
  };

  // Phase 2: push the previewed values to the connected site.
  // `isAutoRetry`: internal recursion flag used by the auto-republish loop so
  // we can force `force_republish=true` on retries and not reset the counter.
  const applyToSite = async (opts?: { isAutoRetry?: boolean }) => {
    const isAutoRetry = !!opts?.isAutoRetry;
    if (!isAutoRetry) autoRepublishRef.current = 0;
    if (!result) return;
    setApplying(true);
    setApplyError(null);
    try {
      // Snapshot the live page BEFORE we push so the verification panel can
      // show which Elementor fields actually changed after Force republish.
      const before = await fetchLiveSnapshot();
      if (before) {
        setPreApplySnapshot({ ...before, fetchedAt: new Date().toISOString() });
      } else {
        setPreApplySnapshot(null);
      }
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

      // Optionally purge WordPress / CDN cache so the fresh HTML shows up
      // right away — especially useful after Force republish since CDN edge
      // nodes and page-cache plugins otherwise keep serving the stale copy.
      if (data.pushed_to_cms && purgeAfterApply && websiteId) {
        await purgeCache({ silent: true });
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


  // Perform a single verification pass. Returns whether all monitored
  // fields matched, plus the verification snapshot that was stored to state.
  const runVerifyOnce = async (): Promise<{
    ok: boolean;
    found: boolean;
    error?: string;
    snapshot: {
      ok: boolean;
      live: { title: string; contentText: string; seoTitle?: string | null; seoDescription?: string | null };
      matches: { title: boolean; content: boolean; seoTitle: boolean; seoDescription: boolean };
      error?: string;
    };
  }> => {
    const contentType = page.type === "product" ? "products" : "pages";
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
      const snap = {
        ok: false,
        live: { title: "", contentText: "" },
        matches: { title: false, content: false, seoTitle: false, seoDescription: false },
        error: "Could not find this page on the live site after refresh.",
      };
      setVerification({ ...snap, fetchedAt: new Date().toISOString() });
      return { ok: false, found: false, error: "not_found", snapshot: snap };
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

    const snap = {
      ok,
      live: { title: liveTitle, contentText: liveContentText, seoTitle: liveSeoTitle, seoDescription: liveSeoDesc },
      matches,
    };
    setVerification({ ...snap, fetchedAt: new Date().toISOString() });
    return { ok, found: true, snapshot: snap };
  };

  // Purge WordPress / CDN cache via known plugin REST endpoints so the fresh
  // HTML shows up right after Force republish instead of the cached copy.
  const purgeCache = async (opts: { silent?: boolean } = {}) => {
    if (!websiteId) return null;
    setPurging(true);
    try {
      const { data, error } = await supabase.functions.invoke("purge-wordpress-cache", {
        body: { website_id: websiteId, page_url: result?.external_url || page.url || undefined },
      });
      if (error) throw error;
      const snap = {
        success: !!data?.success,
        purged_plugins: data?.purged_plugins || [],
        detected_plugins: data?.detected_plugins || [],
        total_attempts: data?.total_attempts || 0,
        note: data?.note,
        at: new Date().toISOString(),
      };
      setPurgeResult(snap);
      if (!opts.silent) {
        if (snap.success) {
          toast({
            title: "Cache purged",
            description: snap.purged_plugins.length
              ? `Cleared: ${snap.purged_plugins.join(", ")}`
              : "Cache clear request accepted.",
          });
        } else {
          toast({
            title: "No cache plugin responded",
            description: snap.note || "If Cloudflare or another CDN sits in front of the site, purge it from that dashboard.",
          });
        }
      }
      return snap;
    } catch (err: any) {
      if (!opts.silent) handleApiError(err, { title: "Cache purge failed" });
      setPurgeResult({
        success: false,
        purged_plugins: [],
        detected_plugins: [],
        total_attempts: 0,
        note: err?.message || String(err),
        at: new Date().toISOString(),
      });
      return null;
    } finally {
      setPurging(false);
    }
  };

  // Re-fetch the page from the connected site until every pushed field is
  // confirmed live. Polls with exponential backoff so CDN/CMS caches have
  // time to flush without the user having to click "Recheck" manually.
  const verifyLive = async () => {
    setVerifying(true);
    setVerification(null);
    setVerifyAttempt(0);

    let lastOk = false;
    let lastErr: string | undefined;
    let lastSnapshot: Awaited<ReturnType<typeof runVerifyOnce>>["snapshot"] | null = null;
    let attemptsUsed = 0;

    try {
      for (let i = 0; i < VERIFY_MAX_ATTEMPTS; i++) {
        setVerifyAttempt(i + 1);
        attemptsUsed = i + 1;
        await new Promise((r) => setTimeout(r, VERIFY_DELAYS_MS[i] ?? 30000));
        try {
          const { ok, snapshot } = await runVerifyOnce();
          lastOk = ok;
          lastSnapshot = snapshot;
          if (ok) break;
        } catch (err: any) {
          lastErr = err?.message || "Verification failed";
          lastSnapshot = {
            ok: false,
            live: { title: "", contentText: "" },
            matches: { title: false, content: false, seoTitle: false, seoDescription: false },
            error: lastErr,
          };
          setVerification({ ...lastSnapshot, fetchedAt: new Date().toISOString() });
          // keep retrying — transient fetch errors shouldn't stop auto-verify
        }
      }

      const liveUrl = result?.external_url || page.url;
      if (lastOk) {
        const confirmed = [
          verification?.matches?.title !== false && "title",
          verification?.matches?.content !== false && "content",
          verification?.matches?.seoTitle !== false && "SEO title",
          verification?.matches?.seoDescription !== false && "meta description",
        ].filter(Boolean) as string[];
        toast({
          title: "✓ Verified on live site",
          description: `Confirmed updated${confirmed.length ? `: ${confirmed.join(", ")}` : ""}${liveUrl ? ` — ${liveUrl}` : ""}`,
          action: liveUrl
            ? (
                <ToastAction altText="Open live page" onClick={() => window.open(liveUrl, "_blank", "noopener,noreferrer")}>
                  Open page
                </ToastAction>
              )
            : undefined,
        });
      } else {
        toast({
          title: "Live page still differs",
          description: `We re-checked ${VERIFY_MAX_ATTEMPTS}× but the CMS/CDN may still be caching. Click Recheck in a minute.`,
          variant: "destructive",
        });
      }

      // Save the final verification result so users can review this Apply run later.
      if (lastSnapshot) {
        await persistVerification({ ...lastSnapshot, attempts: attemptsUsed });
        // Refresh the history list (fire-and-forget)
        supabase
          .from("seo_apply_verifications")
          .select("id, created_at, verified_all, force_republish, attempts, page_url, matches, error")
          .eq("workspace_id", workspaceId!)
          .eq("page_id", String(page.id))
          .order("created_at", { ascending: false })
          .limit(10)
          .then(({ data }) => {
            if (data) setPastVerifications(data as PastVerification[]);
          });
      }
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
                <label className="flex items-start gap-2 text-xs text-muted-foreground rounded-md border border-dashed border-sky-500/40 bg-sky-500/5 p-2 cursor-pointer hover:bg-sky-500/10">
                  <Checkbox
                    checked={purgeAfterApply}
                    onCheckedChange={(v) => setPurgeAfterApply(v === true)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-foreground">Purge WordPress cache after apply</span>
                    <br />
                    After the push, automatically clears WP Rocket, LiteSpeed, W3 Total Cache, WP Super Cache, SG Optimizer, Cloudflare (WP plugin), Elementor CSS, and other detected caches so the live page shows the update immediately.
                    {purgeResult && (
                      <span className="block mt-1">
                        {purgeResult.success ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ✓ Purged: {purgeResult.purged_plugins.join(", ") || "cache endpoint accepted"}
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            • {purgeResult.note || "No cache plugin responded — check your CDN dashboard."}
                          </span>
                        )}
                      </span>
                    )}
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
                    variant="outline"
                    onClick={() => purgeCache()}
                    disabled={purging || applying || !websiteId}
                    className="gap-1.5 text-xs"
                    title="Clear WordPress and CDN caches now (WP Rocket, LiteSpeed, W3TC, WP Super Cache, SG Optimizer, Cloudflare plugin, Elementor CSS)."
                  >
                    {purging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    {purging ? "Purging..." : "Purge cache now"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => applyToSite()}
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


            {/* Verification history — surface past Apply-to-site runs saved in the DB */}
            {pastVerifications.length > 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                    Previous verifications
                    <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{pastVerifications.length}</Badge>
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[11px]"
                    onClick={() => setShowHistory((v) => !v)}
                  >
                    {showHistory ? "Hide" : "Show"}
                  </Button>
                </div>
                {showHistory && (
                  <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {pastVerifications.map((v) => {
                      const fields: Array<[string, boolean | undefined]> = [
                        ["Title", v.matches?.title],
                        ["Content", v.matches?.content],
                        ["SEO title", v.matches?.seoTitle],
                        ["Meta desc", v.matches?.seoDescription],
                      ];
                      return (
                        <li key={v.id} className="rounded border border-border/60 bg-background/60 p-2 text-[11px] space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5">
                              {v.verified_all ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <span className="h-2.5 w-2.5 rounded-full border border-amber-500" />
                              )}
                              <span className={v.verified_all ? "text-emerald-600" : "text-amber-600"}>
                                {v.verified_all ? "All fields matched" : "Partial match"}
                              </span>
                              {v.force_republish && (
                                <Badge variant="outline" className="h-4 text-[9px] px-1">force</Badge>
                              )}
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                              {new Date(v.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {fields.map(([label, ok]) => (
                              <span
                                key={label}
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
                                  ok
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                }`}
                              >
                                {ok ? "✓" : "•"} {label}
                              </span>
                            ))}
                            <span className="text-muted-foreground text-[10px] ml-auto">
                              {v.attempts} attempt{v.attempts === 1 ? "" : "s"}
                            </span>
                          </div>
                          {v.page_url && (
                            <a
                              href={v.page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 truncate"
                            >
                              <ArrowUpRight className="h-2.5 w-2.5" /> {v.page_url}
                            </a>
                          )}
                          {v.error && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">{v.error}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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
                    Auto-verifying live page… attempt {verifyAttempt || 1} of {VERIFY_MAX_ATTEMPTS}. We keep retrying until the CDN/CMS cache clears.
                  </p>
                )}


                {!verifying && verification && (
                  <>
                    {verification.error && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">{verification.error}</p>
                    )}
                    <ul className="text-[11px] space-y-2">
                      {(["title", "content", "seoTitle", "seoDescription"] as const).map((k) => {
                        const matched = verification.matches[k];
                        const label = k === "seoTitle" ? "SEO title" : k === "seoDescription" ? "Meta description" : k;
                        const liveVal = k === "title" ? (verification.live.title || "")
                          : k === "content" ? (verification.live.contentText || "")
                          : k === "seoTitle" ? String(verification.live.seoTitle || "")
                          : String(verification.live.seoDescription || "");
                        const expectedVal = k === "title" ? (page.title || "")
                          : k === "content" ? htmlToText(result?.content || page.content)
                          : k === "seoTitle" ? (result?.seo_title || "")
                          : (result?.seo_description || "");
                        const reason = !matched ? diagnoseFieldMismatch(k, expectedVal, liveVal, {
                          forceRepublish,
                          attempts: verifyAttempt,
                          hasElementorHint: /elementor/i.test(verification.live.contentText || verification.live.title || ""),
                        }) : null;
                        return (
                          <li key={k} className="space-y-1">
                            <div className="flex items-center gap-2">
                              {matched ? (
                                <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                              ) : (
                                <span className="h-3 w-3 rounded-full border border-amber-500 shrink-0" />
                              )}
                              <span className="capitalize text-muted-foreground">{label}</span>
                              <span className={matched ? "text-emerald-600" : "text-amber-600"}>
                                {matched ? "updated on live" : "not detected yet"}
                              </span>
                            </div>
                            {reason && (
                              <div className="ml-5 rounded border border-amber-500/30 bg-amber-500/5 p-2 space-y-1">
                                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                  <span className="font-medium">Likely cause:</span> {reason.cause}
                                </p>
                                <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                                  {reason.fixes.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                              </div>
                            )}
                          </li>
                        );
                      })}
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

                    {/* Field-level before/after — shows exactly which
                        Elementor-managed fields changed on the live page
                        after Force republish, with excerpts of each side. */}
                    {preApplySnapshot && verification && (() => {
                      const rows: {
                        key: string;
                        label: string;
                        before: string;
                        after: string;
                      }[] = [
                        {
                          key: "title",
                          label: "Title",
                          before: preApplySnapshot.title || "",
                          after: verification.live.title || "",
                        },
                        {
                          key: "content",
                          label: "Content",
                          before: preApplySnapshot.contentText || "",
                          after: verification.live.contentText || "",
                        },
                        {
                          key: "seoTitle",
                          label: "SEO title",
                          before: String(preApplySnapshot.seoTitle || ""),
                          after: String(verification.live.seoTitle || ""),
                        },
                        {
                          key: "seoDescription",
                          label: "Meta description",
                          before: String(preApplySnapshot.seoDescription || ""),
                          after: String(verification.live.seoDescription || ""),
                        },
                      ];
                      const norm = (s: string) => s.replace(/\s+/g, " ").trim();
                      const excerpt = (s: string, n = 160) => {
                        const t = norm(s);
                        return t.length > n ? t.slice(0, n) + "…" : t;
                      };
                      const changedRows = rows.filter((r) => norm(r.before) !== norm(r.after));
                      const changedCount = changedRows.length;
                      return (
                        <div className="rounded border border-border bg-background/60 p-2 mt-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Changed on live {forceRepublish ? "(after Force republish)" : ""}
                              <span className={`ml-1.5 font-medium normal-case ${changedCount ? "text-emerald-600" : "text-muted-foreground"}`}>
                                {changedCount} of {rows.length} field{rows.length === 1 ? "" : "s"}
                              </span>
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowFieldChanges((v) => !v)}
                              className="h-5 text-[10px] gap-1"
                            >
                              {showFieldChanges ? "Hide" : "Show"}
                            </Button>
                          </div>
                          {showFieldChanges && (
                            <ul className="space-y-2">
                              {rows.map((r) => {
                                const changed = norm(r.before) !== norm(r.after);
                                const beforeEmpty = !norm(r.before);
                                const afterEmpty = !norm(r.after);
                                return (
                                  <li key={r.key} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-block h-2 w-2 rounded-full ${changed ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                                      <span className="text-[11px] font-medium">{r.label}</span>
                                      <span className={`text-[10px] ${changed ? "text-emerald-600" : "text-muted-foreground"}`}>
                                        {changed ? "changed" : "unchanged"}
                                      </span>
                                    </div>
                                    {changed && (
                                      <div className="ml-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        <div className="rounded border border-amber-500/30 bg-amber-500/5 p-1.5">
                                          <p className="text-[9px] uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-0.5">Before</p>
                                          <p className="text-[11px] text-muted-foreground break-words">
                                            {beforeEmpty ? <span className="italic">(empty)</span> : excerpt(r.before)}
                                          </p>
                                        </div>
                                        <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-1.5">
                                          <p className="text-[9px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-0.5">After</p>
                                          <p className="text-[11px] text-foreground break-words">
                                            {afterEmpty ? <span className="italic">(empty)</span> : excerpt(r.after)}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          {preApplySnapshot.fetchedAt && (
                            <p className="text-[10px] text-muted-foreground">
                              Before snapshot taken {new Date(preApplySnapshot.fetchedAt).toLocaleTimeString()} · After from live re-fetch.
                            </p>
                          )}
                        </div>
                      );
                    })()}



                    <div className="flex items-center justify-between gap-2 pt-1">
                      <p className="text-[10px] text-muted-foreground">
                        Fetched {new Date(verification.fetchedAt).toLocaleTimeString()}. If fields still show "not detected yet", your CMS/CDN may be caching — wait a moment and click Recheck.
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowVerifyDiff((v) => !v)}
                        className="h-6 text-[11px] gap-1 shrink-0"
                      >
                        {showVerifyDiff ? "Hide diff" : "Show diff"}
                      </Button>
                    </div>

                    {showVerifyDiff && (
                      <div className="space-y-3 pt-2 border-t border-border/60">
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-amber-500/40" /> Missing on live</span>
                          <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-sky-500/30" /> Extra on live</span>
                        </div>
                        {(() => {
                          const rows: { label: string; expected: string; live: string; matched: boolean }[] = [
                            { label: "Title", expected: page.title || "", live: verification.live.title || "", matched: verification.matches.title },
                            { label: "Content", expected: htmlToText(result?.content || page.content), live: verification.live.contentText || "", matched: verification.matches.content },
                            { label: "SEO title", expected: result?.seo_title || "", live: String(verification.live.seoTitle || ""), matched: verification.matches.seoTitle },
                            { label: "Meta description", expected: result?.seo_description || "", live: String(verification.live.seoDescription || ""), matched: verification.matches.seoDescription },
                          ].filter((r) => r.expected || r.live);
                          return rows.map((r) => (
                            <div key={r.label} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="text-[11px] font-medium">{r.label}</p>
                                <span className={`text-[10px] ${r.matched ? "text-emerald-600" : "text-amber-600"}`}>
                                  {r.matched ? "match" : "differs"}
                                </span>
                              </div>
                              <DiffText expected={r.expected} live={r.live} />
                            </div>
                          ));
                        })()}
                      </div>
                    )}

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
