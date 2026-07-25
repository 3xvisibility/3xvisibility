import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search, Eye, Trash2, ExternalLink, FileText, Send, Pencil, Tag, Save,
  Loader2, CheckSquare, X, Download, RefreshCw, ChevronLeft, ChevronRight,
  RotateCw, ArrowUpDown, Clock, Sparkles, Languages, Copy, Code, BarChart3,
  MoreVertical, Globe, TrendingUp, AlertCircle, CheckCircle2, Activity, ScanEye, ShieldCheck, Wrench, Send as SendIcon, LayoutTemplate, Palette
} from "lucide-react";
import ContainerWidthControl from "@/components/settings/ContainerWidthControl";
import BulkBoxSettingsDialog from "@/components/settings/BulkBoxSettingsDialog";
import { LiveGenerationProgress } from "@/components/generated-pages/LiveGenerationProgress";
import { VisualFidelityDialog } from "@/components/generated-pages/VisualFidelityDialog";
import { RepublishDiffDialog, type RepublishSnapshot } from "@/components/generated-pages/RepublishDiffDialog";
import { VerificationHistoryDialog } from "@/components/website-content/VerificationHistoryDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DuplicateContentDialog } from "@/components/DuplicateContentDialog";
import { SeoAnalysisDialog } from "@/components/SeoAnalysisDialog";
import { PublishWebsiteSelector } from "@/components/campaigns/PublishWebsiteSelector";
import { HTML_ONLY_MODE } from "@/lib/publish-format";
import { PublishFormatDialog, type PublishFormat } from "@/components/generated-pages/PublishFormatDialog";

import { PublishLogDialog, type PublishLogResult, type PublishStep } from "@/components/campaigns/PublishLogDialog";
import { PublishResultSummary } from "@/components/generated-pages/PublishResultSummary";

import { exportPagesCsv, exportPagesJson, exportDataFile } from "@/lib/export-csv";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { wsChannel } from "@/lib/realtime-scope";
import type { Tables } from "@/integrations/supabase/types";
import { calculateSeoScore } from "@/lib/seo-score";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";
import { calculateFreshness } from "@/lib/content-freshness";
import { ScoresBadgeGroup } from "@/components/ScoresBadgeGroup";
import { useFidelityChecks, runFidelityCheck } from "@/hooks/useFidelityChecks";
import { FidelityBadge } from "@/components/generated-pages/FidelityBadge";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { logAudit } from "@/lib/audit";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSubscription } from "@/hooks/use-subscription";

type GeneratedPage = Tables<"generated_pages"> & {
  campaigns?: { name: string; publish_type?: string | null; publish_format?: string | null } | null;
  websites?: { name: string; type?: string | null; url?: string | null } | null;
};

/** Normalize a stored page URL into a safe, absolute, openable link. */
function normalizeUrl(raw?: string | null): string | null {
  if (!raw) return null;
  let u = String(raw).trim().replace(/\s+/g, "");
  if (!u || u === "#" || u.toLowerCase() === "null" || u.toLowerCase() === "undefined") return null;
  if (u.startsWith("//")) u = `https:${u}`;
  if (!/^https?:\/\//i.test(u)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return null; // block javascript:, data:, etc.
    u = `https://${u.replace(/^\/+/, "")}`;
  }
  try {
    return new URL(u).toString();
  } catch {
    return null;
  }
}

/** Best-effort live URL for a page: stored URL first, then site base + slug. */
function resolvePageUrl(page: GeneratedPage): string | null {
  const direct = normalizeUrl(page.external_url);
  if (direct) return direct;
  const base = normalizeUrl(page.websites?.url);
  const isLive = page.status === "published" || page.status === "done";
  if (base && isLive && page.slug) {
    try {
      const url = new URL(base);
      const basePath = url.pathname.replace(/\/+$/, "");
      url.pathname = `${basePath}/${String(page.slug).replace(/^\/+/, "")}`;
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return null;
    }
  }
  return null;
}

function openPageUrl(url: string) {
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) window.location.href = url;
}


const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; labelKey: string }> = {
  queued:     { icon: Clock,         color: "text-muted-foreground", bg: "bg-muted text-muted-foreground border-border", labelKey: "status.queued" },
  pending:    { icon: Clock,         color: "text-amber-500",        bg: "bg-amber-500/10 text-amber-600 border-amber-500/20", labelKey: "status.pending" },
  generating: { icon: Loader2,       color: "text-primary",          bg: "bg-primary/10 text-primary border-primary/20", labelKey: "status.generating" },
  publishing: { icon: SendIcon,      color: "text-primary",         bg: "bg-primary/10 text-primary border-primary/20", labelKey: "status.publishing" },
  published:  { icon: CheckCircle2,  color: "text-emerald-500",      bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", labelKey: "status.published" },
  done:       { icon: CheckCircle2,  color: "text-emerald-500",      bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", labelKey: "status.done" },
  failed:     { icon: AlertCircle,   color: "text-destructive",      bg: "bg-destructive/10 text-destructive border-destructive/20", labelKey: "status.failed" },
};


const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const PUBLISHABLE_PAGE_STATUSES = new Set(["pending", "failed", "queued", "generating", "publishing"]);

const canPublishExistingPage = (page?: Pick<GeneratedPage, "status" | "content"> | null) =>
  Boolean(page?.content?.trim()) && PUBLISHABLE_PAGE_STATUSES.has(page.status);

const publishActionLabel = (status: string) => (status === "pending" ? "Publish" : "Retry publish");

export default function GeneratedPagesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [freshnessFilter, setFreshnessFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewPage, setPreviewPage] = useState<GeneratedPage | null>(null);
  const [seoEditPage, setSeoEditPage] = useState<GeneratedPage | null>(null);
  const [widthPage, setWidthPage] = useState<GeneratedPage | null>(null);
  const [bulkWidthOpen, setBulkWidthOpen] = useState(false);
  const [seoForm, setSeoForm] = useState({ seo_title: "", seo_description: "", seo_keywords: "" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSeoOpen, setBulkSeoOpen] = useState(false);
  const [bulkSeoMode, setBulkSeoMode] = useState<"blanket" | "inline">("inline");
  const [bulkSeoForm, setBulkSeoForm] = useState({ seo_title: "", seo_description: "", seo_keywords: "" });
  const [bulkSeoApply, setBulkSeoApply] = useState({ title: true, description: true, keywords: true });
  const [inlineSeoEdits, setInlineSeoEdits] = useState<Record<string, { seo_title: string; seo_description: string; seo_keywords: string }>>({});
  const [publishType, setPublishType] = useState<"page" | "product">("page");
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translateLang, setTranslateLang] = useState("fr");
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [jsonPayloadPage, setJsonPayloadPage] = useState<GeneratedPage | null>(null);
  const [fidelityPage, setFidelityPage] = useState<GeneratedPage | null>(null);
  const [seoAnalysisPage, setSeoAnalysisPage] = useState<GeneratedPage | null>(null);
  const [showWebsiteSelector, setShowWebsiteSelector] = useState(false);
  // Output format asked before every publish: real code (1:1), Elementor, Shopify.
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [publishFormat, setPublishFormat] = useState<PublishFormat>("html");
  // When the user ticks "apply to every publish", the chosen format is reused
  // for the whole batch (and later publishes) without re-asking.
  const [rememberedFormat, setRememberedFormat] = useState<PublishFormat | null>(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("pgp:publish-format") : null;
    return saved === "html" || saved === "elementor" || saved === "shopify" ? saved : null;
  });
  const persistRememberedFormat = (format: PublishFormat | null) => {
    setRememberedFormat(format);
    if (typeof window === "undefined") return;
    if (format) window.localStorage.setItem("pgp:publish-format", format);
    else window.localStorage.removeItem("pgp:publish-format");
  };

  const [pendingPublishIds, setPendingPublishIds] = useState<string[]>([]);
  const [pendingPublishAction, setPendingPublishAction] = useState<"publish" | "bulk" | "retry">("publish");
  const [publishLog, setPublishLog] = useState<PublishLogResult[] | null>(null);
  // Persistent summary of the last publish run (success/failed per page).
  const [publishSummary, setPublishSummary] = useState<PublishLogResult[] | null>(null);

  // Before/after republish diff: snapshots captured at trigger time, keyed by page id.
  const republishSnapshotsRef = useRef<Record<string, RepublishSnapshot>>({});
  const [diffState, setDiffState] = useState<{ before: RepublishSnapshot; after: RepublishSnapshot } | null>(null);
  const [verifyHistoryOpen, setVerifyHistoryOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { t } = useLanguage();
  const { pagesUsed, pagesLimit, pagesRemaining, plan } = useSubscription();
  const wsId = currentWorkspace?.id;

  const getPublishFailureMessage = (data: any, fallback: string) => {
    const raw = data?.results?.find((result: any) => result.status === "failed")?.error || data?.error || fallback;
    const msg = String(raw);
    if (msg.toLowerCase().includes("connector pre-flight failed")) {
      return `${msg} Download/reinstall the latest 3xVisibility WordPress Connector plugin, confirm Elementor is active, then retry.`;
    }
    if (msg.includes("_elementor_data")) {
      return `${msg} The page was rolled back so broken Elementor JSON is not published.`;
    }
    return msg;
  };

  // Normalize edge-function publish results and keep a persistent summary
  // so the screen shows exactly which pages succeeded / failed and why.
  const recordPublishResults = (data: any, ids?: string[], fallbackError?: string) => {
    let results: PublishLogResult[] = Array.isArray(data?.results)
      ? (data.results as PublishLogResult[])
      : [];
    if (!results.length && ids?.length) {
      results = ids.map((id) => ({
        id,
        status: fallbackError ? "failed" : "published",
        error: fallbackError,
      }));
    }
    if (!results.length) return;
    const enriched = results.map((r) => {
      const page = pages.find((p) => p.id === r.id);
      return {
        ...r,
        title: r.title || page?.title || page?.seo_title || page?.slug,
        slug: r.slug || page?.slug || undefined,
        external_url: r.external_url || page?.external_url || undefined,
        error: r.error || (r.status !== "published" ? page?.error_message || fallbackError || undefined : undefined),
      };
    });
    setPublishSummary(enriched);
    setPublishLog(enriched);
  };


  // Show the persisted per-page publish timeline (validation, media import,
  // WordPress/Shopify publishing progress + results) in the publish-log dialog.
  const openPublishStatus = (page: GeneratedPage) => {
    const steps = (page as unknown as { publish_steps?: PublishStep[] | null }).publish_steps;
    setPublishLog([{
      id: page.id,
      title: page.title,
      status: page.status,
      external_url: page.external_url || undefined,
      error: page.error_message || undefined,
      steps: Array.isArray(steps) ? steps : undefined,
    }]);
  };
  const hasPublishStatus = (page: GeneratedPage) =>
    Array.isArray((page as { publish_steps?: unknown }).publish_steps) ||
    ["published", "failed", "publishing"].includes(page.status);

  // ─── Data Query ────────────────────────────────────────────
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["generated-pages", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("*, campaigns(name, publish_type, publish_format), websites(name, type, url)")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GeneratedPage[];
    },
  });

  // Baseline template HTML for the visual-validation gate (campaign → template).
  const baselineCampaignId = fidelityPage?.campaign_id || null;
  const { data: baselineHtml } = useQuery({
    queryKey: ["template-baseline", baselineCampaignId],
    enabled: !!baselineCampaignId,
    queryFn: async () => {
      const { data: camp } = await supabase
        .from("campaigns").select("template_id").eq("id", baselineCampaignId!).maybeSingle();
      if (!camp?.template_id) return null;
      const { data: tpl } = await supabase
        .from("templates").select("content").eq("id", camp.template_id).maybeSingle();
      return tpl?.content ?? null;
    },
  });


  // ─── Realtime: live publish-status updates ────────────────
  // Subscribes to `generated_pages` UPDATE/INSERT/DELETE events for the
  // current workspace so each row's status (publishing → published /
  // failed) reflects WordPress + Shopify publish completions immediately
  // — no manual refresh needed. UPDATE events patch the cache in place
  // (no flicker). INSERT/DELETE invalidate so new/removed rows appear.
  useEffect(() => {
    if (!wsId) return;
    const channel = supabase
      .channel(wsChannel("generated-pages", wsId))
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "generated_pages", filter: `workspace_id=eq.${wsId}` },
        (payload) => {
          const next = payload.new as GeneratedPage;
          const prev = payload.old as Partial<GeneratedPage>;
          // Patch cache in-place to avoid refetch flicker. Preserve the
          // joined campaigns/websites relations from the existing cached
          // row since postgres_changes only delivers base-table columns.
          queryClient.setQueryData<GeneratedPage[] | undefined>(
            ["generated-pages", wsId],
            (old) => {
              if (!old) return old;
              return old.map((p) =>
                p.id === next.id
                  ? { ...p, ...next, campaigns: p.campaigns, websites: p.websites }
                  : p
              );
            }
          );
          // Toast on terminal publish transitions for the WP/Shopify flow.
          if (prev?.status !== next.status) {
            // Keep the plan usage counter (remaining pages text) in sync
            // whenever a page reaches a terminal generation/publish state.
            queryClient.invalidateQueries({ queryKey: ["user-subscription", wsId] });
            if (next.status === "published") {
              toast({
                title: "Page published",
                description: next.external_url ? `Live at ${next.external_url}` : next.title,
              });
              // If this was a republish we captured a "before" snapshot for,
              // surface the before/after diff automatically.
              const snap = republishSnapshotsRef.current[next.id];
              if (snap) {
                delete republishSnapshotsRef.current[next.id];
                setDiffState({
                  before: snap,
                  after: { content: next.content, external_url: next.external_url, title: next.title },
                });
              }
            } else if (next.status === "failed" && prev?.status === "publishing") {
              toast({
                title: "Publish failed",
                description: next.error_message || next.title,
                variant: "destructive",
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "generated_pages", filter: `workspace_id=eq.${wsId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["generated-pages", wsId] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-page-count"] });
          queryClient.invalidateQueries({ queryKey: ["user-subscription", wsId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "generated_pages", filter: `workspace_id=eq.${wsId}` },
        (payload) => {
          const oldRow = payload.old as Partial<GeneratedPage>;
          queryClient.setQueryData<GeneratedPage[] | undefined>(
            ["generated-pages", wsId],
            (old) => (old ? old.filter((p) => p.id !== oldRow.id) : old)
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [wsId, queryClient, toast]);

  // ─── Mutations ─────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("generated_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-page-count"] });
      toast({ title: "Page deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("generated_pages").delete().in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-page-count"] });
      setSelectedIds(new Set());
      toast({ title: `${count} pages deleted` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: async ({ pageIds, type, websiteId, format }: { pageIds: string[]; type: "page" | "product"; websiteId?: string; format?: PublishFormat }) => {
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: {
          page_ids: pageIds,
          publish_type: type,
          website_id: websiteId,
          publish_format: format ?? "html",
          elementor_mode: "native",
          overwrite_design: true,
        },

      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.failed && !data?.published) {
        throw new Error(getPublishFailureMessage(data, "All selected pages failed to publish."));
      }
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      toast({ title: "Publishing complete", description: `${data.published} published, ${data.failed} failed.` });
      recordPublishResults(data, variables?.pageIds);
      if (wsId) logAudit(wsId, "page_published", "page", variables.pageIds[0], { count: variables.pageIds.length });
      setShowWebsiteSelector(false);
      setPendingPublishIds([]);
    },
    onError: (err: Error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      recordPublishResults(null, variables?.pageIds, err.message);
      toast({ title: "Publishing failed", description: err.message, variant: "destructive" });
    },

  });

  const seoSaveMutation = useMutation({
    mutationFn: async ({ id, seo_title, seo_description, seo_keywords }: { id: string; seo_title: string; seo_description: string; seo_keywords: string }) => {
      const keywordsArr = seo_keywords.split(",").map((k) => k.trim()).filter(Boolean);
      const { error } = await supabase.from("generated_pages").update({
        seo_title: seo_title || null,
        seo_description: seo_description || null,
        seo_keywords: keywordsArr.length > 0 ? keywordsArr : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setSeoEditPage(null);
      toast({ title: "SEO metadata saved" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const bulkSeoSaveMutation = useMutation({
    mutationFn: async ({ ids, seo_title, seo_description, seo_keywords, apply }: {
      ids: string[]; seo_title: string; seo_description: string; seo_keywords: string;
      apply: { title: boolean; description: boolean; keywords: boolean };
    }) => {
      const keywordsArr = seo_keywords.split(",").map((k) => k.trim()).filter(Boolean);
      const updatePayload: Record<string, any> = {};
      if (apply.title) updatePayload.seo_title = seo_title || null;
      if (apply.description) updatePayload.seo_description = seo_description || null;
      if (apply.keywords) updatePayload.seo_keywords = keywordsArr.length > 0 ? keywordsArr : null;
      if (Object.keys(updatePayload).length === 0) throw new Error("Select at least one field");
      const { error } = await supabase.from("generated_pages").update(updatePayload as never).in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setBulkSeoOpen(false);
      setSelectedIds(new Set());
      toast({ title: `Bulk SEO updated (${count} pages)` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const bulkPublishMutation = useMutation({
    mutationFn: async ({ ids, websiteId, type, format }: { ids: string[]; websiteId?: string; type?: "page" | "product"; format?: PublishFormat }) => {
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: {
          page_ids: ids,
          publish_type: type ?? publishType,
          website_id: websiteId,
          publish_format: format ?? "html",
          elementor_mode: "native",
          overwrite_design: true,
        },

      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.failed && !data?.published) {
        throw new Error(getPublishFailureMessage(data, "All selected pages failed to publish."));
      }
      return data;
    },
    onSuccess: (data, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setSelectedIds(new Set());
      toast({ title: "Bulk publish complete", description: `${data.published} published, ${data.failed} failed.` });
      recordPublishResults(data, ids);
      if (wsId) logAudit(wsId, "pages_bulk_published", "page", null, { count: ids.length, published: data.published });
      setShowWebsiteSelector(false);
      setPendingPublishIds([]);
    },
    onError: (err: Error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      recordPublishResults(null, variables?.ids, err.message);
      toast({ title: "Bulk publish failed", description: err.message, variant: "destructive" });
    },

  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase.from("generated_pages").update({ status: status as any }).in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setSelectedIds(new Set());
      toast({ title: `${count} pages set to ${status}` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const retryFailedMutation = useMutation({
    mutationFn: async ({ ids, websiteId, type, format }: { ids: string[]; websiteId?: string; type?: "page" | "product"; format?: PublishFormat }) => {
      const { error: resetErr } = await supabase.from("generated_pages")
        .update({ status: "pending" as any, error_message: null }).in("id", ids);
      if (resetErr) throw resetErr;
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: {
          page_ids: ids,
          publish_type: type ?? publishType,
          website_id: websiteId,
          publish_format: format ?? "html",
          elementor_mode: "native",
          overwrite_design: true,
        },

      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.failed && !data?.published) {
        throw new Error(getPublishFailureMessage(data, "All selected pages failed to publish."));
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setSelectedIds(new Set());
      toast({ title: "Retry complete", description: `${data.published} published, ${data.failed} failed.` });
      recordPublishResults(data);
      setShowWebsiteSelector(false);
      setPendingPublishIds([]);
    },
    onError: (err: Error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      recordPublishResults(null, variables?.ids, err.message);
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    },

  });

  // Auto-republish job: convert ALL previously published pages to the new
  // full-width default. Clears per-page boxed overrides server-side and
  // re-publishes every published page across its website(s).
  const republishFullWidthMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("republish-full-width", {
        body: { workspace_id: wsId ?? undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      toast({
        title: data?.queued ? "Full-width republish started" : "Nothing to republish",
        description: data?.message ?? "",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Republish failed", description: err.message, variant: "destructive" });
    },
  });

  const [resyncOpen, setResyncOpen] = useState(false);
  const [resyncOptions, setResyncOptions] = useState({
    colors: true,
    typography: true,
    site_settings: true,
  });

  const resyncGlobalsMutation = useMutation({
    mutationFn: async (options: { colors: boolean; typography: boolean; site_settings: boolean }) => {
      const { data, error } = await supabase.functions.invoke("resync-template-globals", {
        body: {
          workspace_id: wsId ?? undefined,
          include_colors: options.colors,
          include_typography: options.typography,
          regenerate_site_settings: options.site_settings,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setResyncOpen(false);
      toast({
        title: data?.synced ? "Template globals re-synced" : "Nothing to re-sync",
        description: data?.message ?? "",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Re-sync failed", description: err.message, variant: "destructive" });
    },
  });





  // Resolve the effective publish_type for a batch of page IDs:
  // - If every selected page belongs to a campaign with the same `publish_type`,
  //   use the campaign value (so the wizard's "Publish As" selection wins).
  // - Otherwise fall back to the local toolbar Select (`publishType`).
  // This keeps the toolbar override intact while making campaign-level
  // configuration the source of truth across publish/republish/retry.
  const resolvePublishTypeFor = (ids: string[]): "page" | "product" => {
    const types = new Set<string>();
    for (const pid of ids) {
      const p = pages.find((pg) => pg.id === pid);
      const t = (p?.campaigns as any)?.publish_type;
      if (t === "page" || t === "product") types.add(t);
    }
    if (types.size === 1) return Array.from(types)[0] as "page" | "product";
    return publishType;
  };

  // Helper: check if pages have website_id, if not show selector
  // Snapshot already-published pages before a republish so we can show a
  // before/after diff once the new version goes live.
  const captureRepublishSnapshots = (ids: string[]) => {
    for (const id of ids) {
      const p = pages.find((pg) => pg.id === id);
      if (p && p.status === "published") {
        republishSnapshotsRef.current[id] = {
          content: p.content,
          external_url: p.external_url,
          title: p.title,
        };
      }
    }
  };

  // Direct (campaign-less) pages have no LiveGenerationProgress feed, so give
  // instant feedback by optimistically flipping them to "publishing" the moment
  // a (re)publish starts. The backend then streams real converting/publishing
  // steps via realtime, and the "Publish status" dialog shows the full timeline.
  const markDirectPagesPublishing = (ids: string[]) => {
    const directIds = new Set(
      ids.filter((id) => {
        const p = pages.find((pg) => pg.id === id);
        return p && !p.campaign_id;
      }),
    );
    if (directIds.size === 0) return;
    queryClient.setQueryData<GeneratedPage[] | undefined>(
      ["generated-pages", wsId],
      (old) =>
        old?.map((p) =>
          directIds.has(p.id)
            ? { ...p, status: "publishing", error_message: null }
            : p,
        ),
    );
  };

  // v1 ships HTML/CSS only: every publish uses real code so the live page is a
  // 1:1 copy of the preview. The format dialog is skipped entirely.
  const handlePublish = (ids: string[], action: "publish" | "bulk" | "retry") => {
    if (ids.length === 0) return;
    setPendingPublishIds(ids);
    setPendingPublishAction(action);
    if (HTML_ONLY_MODE) {
      setPublishFormat("html");
      runPublish(ids, action, "html");
      return;
    }
    if (rememberedFormat) {
      setPublishFormat(rememberedFormat);
      runPublish(ids, action, rememberedFormat);
      return;
    }
    setShowFormatDialog(true);
  };

  const runPublish = (ids: string[], action: "publish" | "bulk" | "retry", format: PublishFormat) => {
    const pagesWithoutSite = ids.filter((pid) => {
      const p = pages.find((pg) => pg.id === pid);
      return !p?.website_id;
    });
    const effType = resolvePublishTypeFor(ids);
    captureRepublishSnapshots(ids);
    if (pagesWithoutSite.length > 0) {
      setPendingPublishIds(ids);
      setPendingPublishAction(action);
      setShowWebsiteSelector(true);
    } else {
      markDirectPagesPublishing(ids);
      if (action === "retry") retryFailedMutation.mutate({ ids, type: effType, format });
      else if (action === "bulk") bulkPublishMutation.mutate({ ids, type: effType, format });
      else publishMutation.mutate({ pageIds: ids, type: effType, format });
    }
  };

  const handleWebsiteSelected = (websiteId: string) => {
    const effType = resolvePublishTypeFor(pendingPublishIds);
    const format = publishFormat;
    markDirectPagesPublishing(pendingPublishIds);
    if (pendingPublishAction === "retry") retryFailedMutation.mutate({ ids: pendingPublishIds, websiteId, type: effType, format });
    else if (pendingPublishAction === "bulk") bulkPublishMutation.mutate({ ids: pendingPublishIds, websiteId, type: effType, format });
    else publishMutation.mutate({ pageIds: pendingPublishIds, type: effType, websiteId, format });
  };




  const translateMutation = useMutation({
    mutationFn: async ({ pageIds, lang }: { pageIds: string[]; lang: string }) => {
      const { data, error } = await supabase.functions.invoke("translate-content", {
        body: { page_ids: pageIds, target_language: lang },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setTranslateOpen(false);
      setSelectedIds(new Set());
      toast({ title: "Translation complete", description: `${data.translated} translated, ${data.failed} failed.` });
    },
    onError: (err: Error) => toast({ title: "Translation failed", description: err.message, variant: "destructive" }),
  });

  const recheckReadinessMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { data, error } = await supabase.functions.invoke("recheck-editor-readiness", {
        body: { page_id: pageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.editor_readiness as { status?: string; reason?: string | null } | undefined;
    },
    onSuccess: (readiness) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      if (readiness?.status === "passed") {
        toast({ title: "Editor ready", description: "The page opens in Edit with Elementor." });
      } else {
        toast({
          title: "Editor check failed",
          description: readiness?.reason || "The page did not pass the readiness check.",
          variant: "destructive",
        });
      }
    },
    onError: (err: Error) => toast({ title: "Re-check failed", description: err.message, variant: "destructive" }),
  });

  const reconvertMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { data, error } = await supabase.functions.invoke("reconvert-template-json", {
        body: { page_id: pageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Reconvert failed");
      return data as { widgets?: number; fields?: number; sections?: number };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      toast({
        title: "Template reconverted",
        description: `Stored JSON rebuilt: ${res?.widgets ?? 0} widgets · ${res?.fields ?? 0} fields. Re-publish to apply.`,
      });
    },
    onError: (err: Error) => toast({ title: "Reconvert failed", description: err.message, variant: "destructive" }),
  });

  // One-click: reconvert stored JSON, then immediately republish the page live.
  const handleRepairAndRepublish = async (pageId: string) => {
    try {
      const res = await reconvertMutation.mutateAsync(pageId);
      toast({
        title: "Template reconverted",
        description: `Rebuilt ${res?.widgets ?? 0} widgets · ${res?.fields ?? 0} fields. Republishing…`,
      });
      handlePublish([pageId], "publish");
    } catch {
      // reconvertMutation.onError already surfaced the failure toast.
    }
  };






  const inlineSeoSaveMutation = useMutation({
    mutationFn: async (edits: Record<string, { seo_title: string; seo_description: string; seo_keywords: string }>) => {
      const promises = Object.entries(edits).map(([id, fields]) => {
        const keywordsArr = fields.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean);
        return supabase.from("generated_pages").update({
          seo_title: fields.seo_title || null,
          seo_description: fields.seo_description || null,
          seo_keywords: keywordsArr.length > 0 ? keywordsArr : null,
        }).eq("id", id);
      });
      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw new Error(`${errors.length} updates failed`);
      return Object.keys(edits).length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setBulkSeoOpen(false);
      setSelectedIds(new Set());
      toast({ title: `SEO updated (${count} pages)` });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // ─── Helpers ───────────────────────────────────────────────
  const openSeoEditor = (page: GeneratedPage) => {
    setSeoEditPage(page);
    setSeoForm({
      seo_title: page.seo_title || "",
      seo_description: page.seo_description || "",
      seo_keywords: (page.seo_keywords || []).join(", "),
    });
  };

  const openBulkSeoEditor = () => {
    setBulkSeoForm({ seo_title: "", seo_description: "", seo_keywords: "" });
    setBulkSeoApply({ title: true, description: true, keywords: true });
    setBulkSeoMode("inline");
    const edits: Record<string, { seo_title: string; seo_description: string; seo_keywords: string }> = {};
    for (const id of selectedIds) {
      const page = pages.find((p) => p.id === id);
      if (page) {
        edits[id] = {
          seo_title: page.seo_title || "",
          seo_description: page.seo_description || "",
          seo_keywords: (page.seo_keywords || []).join(", "),
        };
      }
    }
    setInlineSeoEdits(edits);
    setBulkSeoOpen(true);
  };

  const pendingPages = pages.filter(canPublishExistingPage);
  const retryableQueuedPages = pages.filter((p) => p.status === "queued" || p.status === "publishing");

  // Unique filters
  const uniqueSites = useMemo(() => {
    const sites = new Map<string, string>();
    pages.forEach((p) => { if (p.website_id && p.websites?.name) sites.set(p.website_id, p.websites.name); });
    return Array.from(sites, ([id, name]) => ({ id, name }));
  }, [pages]);

  const uniqueCampaigns = useMemo(() => {
    const campaigns = new Map<string, string>();
    pages.forEach((p) => { if (p.campaign_id && p.campaigns?.name) campaigns.set(p.campaign_id, p.campaigns.name); });
    return Array.from(campaigns, ([id, name]) => ({ id, name }));
  }, [pages]);

  // Filtering & sorting
  const filtered = useMemo(() => {
    const base = pages.filter((p) =>
      (statusFilter === "all" || p.status === statusFilter) &&
      (siteFilter === "all" || p.website_id === siteFilter) &&
      (campaignFilter === "all" || (campaignFilter === "direct" ? !p.campaign_id : p.campaign_id === campaignFilter)) &&
      (freshnessFilter === "all" || calculateFreshness(p.created_at, p.status).level === freshnessFilter) &&
      ((p.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.slug || "").toLowerCase().includes(search.toLowerCase()) ||
        (p.campaigns?.name || "").toLowerCase().includes(search.toLowerCase()))
    );
    if (sortBy === "newest") return base;
    if (sortBy === "oldest") return [...base].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sortBy === "freshness") return [...base].sort((a, b) => calculateFreshness(b.created_at, b.status).ageDays - calculateFreshness(a.created_at, a.status).ageDays);
    const scoreGetter = (p: GeneratedPage) => {
      if (sortBy === "seo_asc" || sortBy === "seo_desc") return calculateContentSeoScore(p.title, p.content, p.slug, {
        url: p.external_url || undefined,
        description: p.seo_description || undefined,
        seoTitle: p.seo_title || undefined,
        seoKeywords: p.seo_keywords || undefined,
      }).score;
      if (sortBy === "sea_asc" || sortBy === "sea_desc") return calculateContentSeaScore(p.title, p.content, p.slug, p.external_url || undefined).score;
      if (sortBy === "geo_asc" || sortBy === "geo_desc") return calculateContentGeoScore(p.title, p.content, p.slug, p.external_url || undefined).score;
      return 0;
    };
    const asc = sortBy.endsWith("_asc");
    return [...base].sort((a, b) => asc ? scoreGetter(a) - scoreGetter(b) : scoreGetter(b) - scoreGetter(a));
  }, [pages, search, statusFilter, siteFilter, campaignFilter, freshnessFilter, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPages = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  // Automatic preview → published HTML/CSS match results for visible pages.
  const publishedVisibleIds = useMemo(
    () => paginatedPages.filter((p) => p.status === "published" || p.status === "done").map((p) => p.id),
    [paginatedPages]
  );
  const { data: fidelityChecks, refetch: refetchFidelity } = useFidelityChecks(publishedVisibleIds);
  const [fidelityRunning, setFidelityRunning] = useState(false);




  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, siteFilter, campaignFilter, freshnessFilter, pageSize, sortBy]);

  // Sync toolbar Publish-As default to the campaign's `publish_type` when
  // a single campaign is filtered. Keeps tools/republish/retry visually
  // aligned with whatever the wizard configured for that campaign.
  useEffect(() => {
    if (campaignFilter === "all" || campaignFilter === "direct") return;
    const sample = pages.find((p) => p.campaign_id === campaignFilter);
    const t = (sample?.campaigns as any)?.publish_type;
    if (t === "page" || t === "product") setPublishType(t);
  }, [campaignFilter, pages]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((p) => p.id)));
  };

  const someSelected = selectedIds.size > 0;
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  // Stats
  const stats = useMemo(() => {
    const s = { total: pages.length, published: 0, pending: 0, failed: 0, active: 0 };
    pages.forEach((p) => {
      if (p.status === "published" || p.status === "done") s.published++;
      else if (p.status === "failed") s.failed++;
      else if (p.status === "generating" || p.status === "publishing" || p.status === "queued") s.active++;
      else if (p.status === "pending") s.pending++;
    });
    return s;
  }, [pages]);

  const freshCounts = useMemo(() => {
    const c = { fresh: 0, aging: 0, stale: 0, outdated: 0 };
    pages.forEach((p) => { c[calculateFreshness(p.created_at, p.status).level]++; });
    return c;
  }, [pages]);

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("generatedPages.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("generatedPages.description")}</p>
          <p className="text-xs mt-1.5">
            <span className="font-semibold text-foreground">{pagesUsed}</span>
            <span className="text-muted-foreground"> / {pagesLimit} pages generated · </span>
            <span className="font-semibold text-primary">{pagesRemaining}</span>
            <span className="text-muted-foreground"> remaining on the {plan} plan</span>
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={publishType} onValueChange={(v) => setPublishType(v as "page" | "product")}>
            <SelectTrigger className="w-[110px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page"><FileText className="h-3 w-3 mr-1.5 inline" />Page</SelectItem>
              <SelectItem value="product"><Globe className="h-3 w-3 mr-1.5 inline" />Product</SelectItem>
            </SelectContent>
          </Select>
          {pendingPages.length > 0 && (
            <Button
              size="sm"
              className="bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              disabled={publishMutation.isPending}
              onClick={() => handlePublish(pendingPages.map((p) => p.id), "publish")}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {publishMutation.isPending ? t("generatedPages.publishing") : t("generatedPages.publishAll", { count: pendingPages.length })}
            </Button>
          )}
          {retryableQueuedPages.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={retryFailedMutation.isPending}
              onClick={() => handlePublish(retryableQueuedPages.map((p) => p.id), "retry")}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${retryFailedMutation.isPending ? "animate-spin" : ""}`} />
              {t("generatedPages.retryQueued", { count: retryableQueuedPages.length })}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setVerifyHistoryOpen(true)}>
            <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Verifications
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1.5" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportPagesCsv(filtered, "generated-pages.csv")}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPagesJson(filtered, "generated-pages.json")}>Export JSON</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportDataFile(filtered.map(p => ({ Title: p.title, Slug: p.slug, Status: p.status, URL: p.external_url || "", Error: p.error_message || "" })), "xlsx", "generated-pages")}>Export Excel</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDuplicateOpen(true)} disabled={pages.length < 2}>
                <Copy className="h-3.5 w-3.5 mr-2" /> Find Duplicates
              </DropdownMenuItem>
              {stats.published > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => republishFullWidthMutation.mutate()}
                    disabled={republishFullWidthMutation.isPending}
                  >
                    <LayoutTemplate className="h-3.5 w-3.5 mr-2" /> Republish all at full width
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setResyncOpen(true)}
                    disabled={resyncGlobalsMutation.isPending}
                  >
                    <Palette className="h-3.5 w-3.5 mr-2" /> Re-sync template globals…
                  </DropdownMenuItem>

                </>

              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Live progress card (only renders when active jobs exist) */}
      {wsId && <LiveGenerationProgress workspaceId={wsId} />}

      {/* Post-publish summary: which pages succeeded / failed and why */}
      {publishSummary && publishSummary.length > 0 && (
        <PublishResultSummary
          results={publishSummary}
          onViewDetails={() => setPublishLog(publishSummary)}
          onRetryFailed={(ids) => handlePublish(ids, "retry")}
          onDismiss={() => setPublishSummary(null)}
          retrying={retryFailedMutation.isPending}
        />
      )}



      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: t("generatedPages.totalPages"), value: stats.total, icon: FileText, color: "text-foreground" },
          { label: t("status.published"), value: stats.published, icon: CheckCircle2, color: "text-emerald-500" },
          { label: t("status.inProgress"), value: stats.active, icon: Activity, color: "text-primary" },
          { label: t("status.pending"), value: stats.pending, icon: Clock, color: "text-amber-500" },
          { label: t("status.failed"), value: stats.failed, icon: AlertCircle, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label} className="shadow-surface border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted/50 ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold tabular-nums">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card className="shadow-surface border-border/50 col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" /> {t("generatedPages.freshnessLabel")}
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-emerald-500 font-medium">{freshCounts.fresh} {t("generatedPages.fresh")}</span>
              <span className="text-primary font-medium">{freshCounts.aging} {t("generatedPages.aging")}</span>
              <span className="text-amber-500 font-medium">{freshCounts.stale} {t("generatedPages.stale")}</span>
              <span className="text-destructive font-medium">{freshCounts.outdated} {t("generatedPages.old")}</span>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("common.searchPages")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("generatedPages.allStatus")}</SelectItem>
            <SelectItem value="queued">{t("status.queued")}</SelectItem>
            <SelectItem value="generating">{t("status.generating")}</SelectItem>
            <SelectItem value="pending">{t("status.pending")}</SelectItem>
            <SelectItem value="publishing">{t("status.publishing")}</SelectItem>
            <SelectItem value="published">{t("status.published")}</SelectItem>
            <SelectItem value="done">{t("status.done")}</SelectItem>
            <SelectItem value="failed">{t("status.failed")}</SelectItem>
          </SelectContent>
        </Select>
        {uniqueSites.length > 0 && (
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder={t("generatedPages.allSites")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("generatedPages.allSites")}</SelectItem>
              {uniqueSites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {uniqueCampaigns.length > 0 && (
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder={t("generatedPages.allCampaigns")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("generatedPages.allCampaigns")}</SelectItem>
              <SelectItem value="direct">{t("generatedPages.directPublish")}</SelectItem>
              {uniqueCampaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={freshnessFilter} onValueChange={setFreshnessFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <Clock className="h-3.5 w-3.5 mr-1.5 shrink-0" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("generatedPages.allFreshness")}</SelectItem>
            <SelectItem value="fresh">{t("generatedPages.freshRange")}</SelectItem>
            <SelectItem value="aging">{t("generatedPages.agingRange")}</SelectItem>
            <SelectItem value="stale">{t("generatedPages.staleRange")}</SelectItem>
            <SelectItem value="outdated">{t("generatedPages.outdatedRange")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 shrink-0" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("generatedPages.newestFirst")}</SelectItem>
            <SelectItem value="oldest">{t("generatedPages.oldestFirst")}</SelectItem>
            <SelectItem value="freshness">{t("generatedPages.stalestFirst")}</SelectItem>
            <SelectItem value="seo_desc">{t("generatedPages.seoBest")}</SelectItem>
            <SelectItem value="seo_asc">{t("generatedPages.seoWorst")}</SelectItem>
            <SelectItem value="sea_desc">{t("generatedPages.seaBest")}</SelectItem>
            <SelectItem value="sea_asc">{t("generatedPages.seaWorst")}</SelectItem>
            <SelectItem value="geo_desc">{t("generatedPages.geoBest")}</SelectItem>
            <SelectItem value="geo_asc">{t("generatedPages.geoWorst")}</SelectItem>
          </SelectContent>
        </Select>

      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <Card className="border-primary/30 bg-primary/5 shadow-surface">
          <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{t("generatedPages.selectedCountShort", { count: selectedIds.size })}</span>
              {HTML_ONLY_MODE ? (
                <Badge variant="secondary" className="text-[10px]">Publishes as real code (HTML/CSS)</Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    setPendingPublishIds([...selectedIds]);
                    setPendingPublishAction("bulk");
                    setShowFormatDialog(true);
                  }}
                >
                  Publish format:&nbsp;
                  <span className="font-semibold">
                    {(rememberedFormat ?? publishFormat) === "html"
                      ? "Real code"
                      : (rememberedFormat ?? publishFormat) === "elementor"
                        ? "Elementor"
                        : "Shopify"}
                  </span>
                  {rememberedFormat && <span className="ml-1 opacity-60">(applied to all)</span>}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" className="h-7 text-xs bg-gradient-primary border-0" disabled={bulkPublishMutation.isPending}
                onClick={() => {
                  const publishable = [...selectedIds].filter((id) => canPublishExistingPage(pages.find((pg) => pg.id === id)));
                  if (!publishable.length) { toast({ title: t("generatedPages.noPublishable"), variant: "destructive" }); return; }
                  handlePublish(publishable, "bulk");
                }}>
                <Send className="h-3 w-3 mr-1" />{bulkPublishMutation.isPending ? "..." : t("generatedPages.publish")}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={retryFailedMutation.isPending}
                onClick={() => {
                  const retryable = [...selectedIds].filter((id) => { const status = pages.find((p) => p.id === id)?.status; return status === "failed" || status === "queued" || status === "publishing"; });
                  if (!retryable.length) { toast({ title: t("generatedPages.noRetryable"), variant: "destructive" }); return; }
                  handlePublish(retryable, "retry");
                }}>
                <RefreshCw className="h-3 w-3 mr-1" />{t("generatedPages.retry")}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openBulkSeoEditor}>
                <Tag className="h-3 w-3 mr-1" />{t("generatedPages.seo")}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setTranslateOpen(true)}>
                <Languages className="h-3 w-3 mr-1" />{t("generatedPages.translate")}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setBulkWidthOpen(true)}>
                <LayoutTemplate className="h-3 w-3 mr-1" />Content width
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={fidelityRunning}
                onClick={async () => {
                  const ids = [...selectedIds].filter((id) => {
                    const s = pages.find((p) => p.id === id)?.status;
                    return s === "published" || s === "done";
                  });
                  if (!ids.length) { toast({ title: "Select published pages first", variant: "destructive" }); return; }
                  setFidelityRunning(true);
                  try {
                    const data = await runFidelityCheck(ids);
                    const rows = (data?.results || []) as Array<{ status?: string }>;
                    const passed = rows.filter((r) => r.status === "passed").length;
                    toast({ title: `Design match: ${passed}/${rows.length} pages identical to preview` });
                    refetchFidelity();
                  } catch (e) {
                    toast({ title: "Fidelity check failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
                  } finally { setFidelityRunning(false); }
                }}>
                <ScanEye className="h-3 w-3 mr-1" />{fidelityRunning ? "Checking..." : "Design match"}
              </Button>

              <Select onValueChange={(status) => bulkStatusMutation.mutate({ ids: [...selectedIds], status })}>
                <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue placeholder={t("generatedPages.setStatus")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("status.pending")}</SelectItem>
                  <SelectItem value="published">{t("status.published")}</SelectItem>
                  <SelectItem value="failed">{t("status.failed")}</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { if (window.confirm(t("generatedPages.confirmDelete", { count: selectedIds.size }))) bulkDeleteMutation.mutate([...selectedIds]); }}
                disabled={bulkDeleteMutation.isPending}>
                <Trash2 className="h-3 w-3 mr-1" />{t("common.delete")}
              </Button>

              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <Card><CardContent className="p-6 space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">{pages.length === 0 ? "No generated pages yet" : "No pages match filters"}</h3>
            <p className="text-sm text-muted-foreground">{pages.length === 0 ? "Run a campaign to generate pages." : "Try adjusting your search or filters."}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-surface overflow-hidden">
          {/* Mobile cards */}
          <div className="lg:hidden divide-y divide-border">
            {paginatedPages.map((page) => {
              const displayTitle = page.title?.trim() || page.seo_title?.trim() || page.slug;
              const isSelected = selectedIds.has(page.id);
              const cfg = STATUS_CONFIG[page.status] || STATUS_CONFIG.pending;
              const liveUrl = resolvePageUrl(page);
              return (
                <div key={page.id} className={`p-4 flex items-start gap-3 ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"} transition-colors`}>
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(page.id)} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        className="font-medium text-sm truncate text-left hover:text-primary hover:underline"
                        title={liveUrl ? `Open ${liveUrl}` : "Open preview"}
                        onClick={() => (liveUrl ? openPageUrl(liveUrl) : setPreviewPage(page))}
                      >
                        {displayTitle}
                      </button>
                      {liveUrl && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={`text-[10px] ${cfg.bg} inline-flex items-center gap-1`}>
                        <cfg.icon className={`h-2.5 w-2.5 ${page.status === "generating" || page.status === "publishing" ? "animate-spin" : ""}`} />
                        {t(cfg.labelKey)}
                      </Badge>
                      {page.campaigns?.name && <Badge variant="outline" className="text-[10px]">{page.campaigns.name}</Badge>}
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-[180px]">{page.slug}</code>
                    </div>
                    <ScoresBadgeGroup
                      title={page.title}
                      content={page.content}
                      slug={page.slug}
                      url={page.external_url || undefined}
                      description={page.seo_description || undefined}
                      seoTitle={page.seo_title}
                      seoKeywords={page.seo_keywords}
                      size="sm"
                    />
                    <FidelityBadge
                      pageId={page.id}
                      pageTitle={displayTitle}
                      isPublished={page.status === "published" || page.status === "done"}
                      check={fidelityChecks?.get(page.id)}
                      onChecked={() => refetchFidelity()}
                    />

                  </div>
                  {page.status === "failed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                      disabled={reconvertMutation.isPending}
                      onClick={() => page.campaign_id ? handleRepairAndRepublish(page.id) : handlePublish([page.id], "retry")}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Retry
                    </Button>
                  )}
                  <DropdownMenu>

                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setPreviewPage(page)}><Eye className="h-3.5 w-3.5 mr-2" />Preview</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openSeoEditor(page)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit Content</DropdownMenuItem>
                      {canPublishExistingPage(page) && (
                        <DropdownMenuItem onClick={() => handlePublish([page.id], page.status === "pending" ? "publish" : "retry")}>
                          {page.status === "pending" ? <Send className="h-3.5 w-3.5 mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                          {publishActionLabel(page.status)}
                        </DropdownMenuItem>
                      )}
                      {page.status === "published" && page.external_id && <DropdownMenuItem onClick={() => handlePublish([page.id], "publish")}><RotateCw className="h-3.5 w-3.5 mr-2" />Re-publish</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => setSeoAnalysisPage(page)}><BarChart3 className="h-3.5 w-3.5 mr-2" />SEO Analysis</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setWidthPage(page)}><LayoutTemplate className="h-3.5 w-3.5 mr-2" />Content width</DropdownMenuItem>
                      {page.campaign_id && <DropdownMenuItem onClick={() => reconvertMutation.mutate(page.id)} disabled={reconvertMutation.isPending}><Wrench className="h-3.5 w-3.5 mr-2" />Repair / Reconvert</DropdownMenuItem>}
                      {page.campaign_id && <DropdownMenuItem onClick={() => handleRepairAndRepublish(page.id)} disabled={reconvertMutation.isPending}><Wrench className="h-3.5 w-3.5 mr-2" />Repair &amp; Republish</DropdownMenuItem>}
                      {hasPublishStatus(page) && <DropdownMenuItem onClick={() => openPublishStatus(page)}><Activity className="h-3.5 w-3.5 mr-2" />Publish status</DropdownMenuItem>}
                      {page.status === "published" && page.external_id && page.websites?.type === "wordpress" && (
                        <DropdownMenuItem
                          disabled={recheckReadinessMutation.isPending && recheckReadinessMutation.variables === page.id}
                          onClick={() => recheckReadinessMutation.mutate(page.id)}
                        >
                          <ShieldCheck className={`h-3.5 w-3.5 mr-2 ${recheckReadinessMutation.isPending && recheckReadinessMutation.variables === page.id ? "animate-spin" : ""}`} />
                          Re-check Elementor readiness
                        </DropdownMenuItem>
                      )}
                      {liveUrl && <DropdownMenuItem onClick={() => openPageUrl(liveUrl)}><ExternalLink className="h-3.5 w-3.5 mr-2" />Open Live</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(page.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                  </th>
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs">{t("generatedPages.page")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs w-24">{t("common.status")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs w-32 hidden xl:table-cell">{t("generatedPages.campaign")}</th>
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs w-32 hidden 2xl:table-cell">{t("generatedPages.slug")}</th>
                  <th className="p-3 text-center font-medium text-muted-foreground text-xs w-36">{t("generatedPages.scores")}</th>
                  <th className="p-3 text-right font-medium text-muted-foreground text-xs w-28">{t("common.actions")}</th>

                </tr>
              </thead>
              <tbody>
                {paginatedPages.map((page) => {
                  const displayTitle = page.title?.trim() || page.seo_title?.trim() || page.slug;
                  const isSelected = selectedIds.has(page.id);
                  const cfg = STATUS_CONFIG[page.status] || STATUS_CONFIG.pending;
                  const freshness = calculateFreshness(page.created_at, page.status);
                  const liveUrl = resolvePageUrl(page);
                  return (
                    <tr key={page.id} className={`border-b last:border-0 ${isSelected ? "bg-primary/5" : "hover:bg-muted/20"} transition-colors`}>
                      <td className="p-3"><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(page.id)} /></td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              className="font-medium truncate max-w-[300px] text-left hover:text-primary hover:underline"
                              title={liveUrl ? `Open ${liveUrl}` : "Open preview"}
                              onClick={() => (liveUrl ? openPageUrl(liveUrl) : setPreviewPage(page))}
                            >
                              {displayTitle}
                            </button>
                            {liveUrl && (
                              <a
                                href={liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-primary shrink-0"
                                onClick={(e) => { e.preventDefault(); openPageUrl(liveUrl); }}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>

                          {page.websites?.name && (
                            <span className="text-[10px] text-muted-foreground">{page.websites.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-[10px] ${cfg.bg} inline-flex items-center gap-1`}>
                          <cfg.icon className={`h-2.5 w-2.5 ${page.status === "generating" || page.status === "publishing" ? "animate-spin" : ""}`} />
                          {t(cfg.labelKey)}
                        </Badge>
                        {page.error_message && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger><AlertCircle className="h-3 w-3 text-destructive ml-1 inline" /></TooltipTrigger>
                              <TooltipContent className="max-w-xs"><p className="text-xs">{page.error_message}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        {page.campaigns?.name ? (
                          <Badge variant="outline" className="text-[10px] truncate max-w-[120px]">{page.campaigns.name}</Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Direct</span>
                        )}
                      </td>
                      <td className="p-3 hidden 2xl:table-cell">
                        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate block max-w-[120px]">{page.slug}</code>
                      </td>
                      <td className="p-3">
                        <ScoresBadgeGroup
                          title={page.title}
                          content={page.content}
                          slug={page.slug}
                          url={page.external_url || undefined}
                          description={page.seo_description || undefined}
                          seoTitle={page.seo_title}
                          seoKeywords={page.seo_keywords}
                          size="sm"
                        />
                        <div className="mt-1">
                          <FidelityBadge
                            pageId={page.id}
                            pageTitle={displayTitle}
                            isPublished={page.status === "published" || page.status === "done"}
                            check={fidelityChecks?.get(page.id)}
                            onChecked={() => refetchFidelity()}
                          />
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-0.5 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openSeoEditor(page)} title="Edit Content">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreviewPage(page)} title="Preview">
                            <Eye className="h-3 w-3" />
                          </Button>
                          {page.status === "failed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                              disabled={reconvertMutation.isPending}
                              onClick={() => page.campaign_id ? handleRepairAndRepublish(page.id) : handlePublish([page.id], "retry")}
                              title="Retry publish"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />Retry
                            </Button>
                          )}
                          <DropdownMenu>

                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {canPublishExistingPage(page) && (
                                <DropdownMenuItem onClick={() => handlePublish([page.id], page.status === "pending" ? "publish" : "retry")}>
                                  {page.status === "pending" ? <Send className="h-3.5 w-3.5 mr-2" /> : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                                  {publishActionLabel(page.status)}
                                </DropdownMenuItem>
                              )}
                              {page.status === "published" && page.external_id && <DropdownMenuItem onClick={() => handlePublish([page.id], "publish")}><RotateCw className="h-3.5 w-3.5 mr-2" />Re-publish</DropdownMenuItem>}
                              <DropdownMenuItem onClick={() => setSeoAnalysisPage(page)}><BarChart3 className="h-3.5 w-3.5 mr-2" />SEO Analysis</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setWidthPage(page)}><LayoutTemplate className="h-3.5 w-3.5 mr-2" />Content width</DropdownMenuItem>
                              {page.campaign_id && <DropdownMenuItem onClick={() => reconvertMutation.mutate(page.id)} disabled={reconvertMutation.isPending}><Wrench className="h-3.5 w-3.5 mr-2" />Repair / Reconvert</DropdownMenuItem>}
                              {page.campaign_id && <DropdownMenuItem onClick={() => handleRepairAndRepublish(page.id)} disabled={reconvertMutation.isPending}><Wrench className="h-3.5 w-3.5 mr-2" />Repair &amp; Republish</DropdownMenuItem>}
                              {hasPublishStatus(page) && <DropdownMenuItem onClick={() => openPublishStatus(page)}><Activity className="h-3.5 w-3.5 mr-2" />Publish status</DropdownMenuItem>}
                              {page.status === "published" && page.external_id && page.websites?.type === "wordpress" && (
                                <DropdownMenuItem
                                  disabled={recheckReadinessMutation.isPending && recheckReadinessMutation.variables === page.id}
                                  onClick={() => recheckReadinessMutation.mutate(page.id)}
                                >
                                  <ShieldCheck className={`h-3.5 w-3.5 mr-2 ${recheckReadinessMutation.isPending && recheckReadinessMutation.variables === page.id ? "animate-spin" : ""}`} />
                                  Re-check Elementor readiness
                                </DropdownMenuItem>
                              )}
                              {liveUrl && <DropdownMenuItem onClick={() => openPageUrl(liveUrl)}><ExternalLink className="h-3.5 w-3.5 mr-2" />Open live</DropdownMenuItem>}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(page.id)}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-7 w-[65px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{PAGE_SIZE_OPTIONS.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (safePage <= 3) pageNum = i + 1;
                else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = safePage - 2 + i;
                return (
                  <Button key={pageNum} variant={pageNum === safePage ? "default" : "outline"} size="icon" className="h-7 w-7 text-xs" onClick={() => setCurrentPage(pageNum)}>
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Dialogs ─────────────────────────────────────────── */}

      {/* Preview */}
      <Dialog open={!!widthPage} onOpenChange={(open) => !open && setWidthPage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Content width — {widthPage?.title}</DialogTitle>
          </DialogHeader>
          {widthPage && (
            <ContainerWidthControl
              table="generated_pages"
              id={widthPage.id}
              campaignId={widthPage.campaign_id}
              inheritLabel="Inherit template / workspace default"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewPage} onOpenChange={(open) => !open && setPreviewPage(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              {previewPage?.title}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              <code className="bg-muted px-1.5 py-0.5 rounded">{previewPage?.slug}</code>
            </p>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            {previewPage && (previewPage.seo_title || previewPage.seo_description) && (
              <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Tag className="h-3 w-3" />SEO Preview</p>
                <div className="space-y-1">
                  <p className="text-primary text-sm font-medium leading-tight">{previewPage.seo_title || previewPage.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{previewPage.seo_description || "No meta description set."}</p>
                  {previewPage.seo_keywords && previewPage.seo_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {previewPage.seo_keywords.map((kw: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>)}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="border rounded-lg p-6 bg-muted/20">
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewPage?.content || "" }} />
            </div>
            {previewPage?.error_message && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm"><strong>Error:</strong> {previewPage.error_message}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* JSON Payload */}
      <Dialog open={!!jsonPayloadPage} onOpenChange={(open) => !open && setJsonPayloadPage(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-primary" />JSON Payload</DialogTitle>
          </DialogHeader>
          {jsonPayloadPage && (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
              <div className="relative">
                <Button size="sm" variant="outline" className="absolute top-2 right-2 h-7 text-xs z-10"
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(jsonPayloadPage, null, 2)); toast({ title: "Copied" }); }}>
                  <Copy className="h-3 w-3 mr-1" />Copy
                </Button>
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify({
                    id: jsonPayloadPage.id, title: jsonPayloadPage.title, slug: jsonPayloadPage.slug,
                    status: jsonPayloadPage.status, external_id: jsonPayloadPage.external_id,
                    external_url: jsonPayloadPage.external_url, seo_title: jsonPayloadPage.seo_title,
                    seo_description: jsonPayloadPage.seo_description, seo_keywords: jsonPayloadPage.seo_keywords,
                    canonical_url: jsonPayloadPage.canonical_url, campaign_id: jsonPayloadPage.campaign_id,
                    website_id: jsonPayloadPage.website_id, content: jsonPayloadPage.content,
                    error_message: jsonPayloadPage.error_message, created_at: jsonPayloadPage.created_at,
                  }, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SEO Edit */}
      <Dialog open={!!seoEditPage} onOpenChange={(open) => !open && setSeoEditPage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary" />Edit Content</DialogTitle>
          </DialogHeader>
          {seoEditPage && (() => {
            const liveKeywords = seoForm.seo_keywords.split(",").map(k => k.trim()).filter(Boolean);
            const liveScore = calculateSeoScore(seoForm.seo_title, seoForm.seo_description, liveKeywords, seoEditPage.title);
            return (
              <div className="space-y-4 mt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{seoEditPage.title}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${liveScore.score >= 85 ? "bg-emerald-500" : liveScore.score >= 60 ? "bg-primary" : liveScore.score >= 35 ? "bg-amber-500" : "bg-destructive"}`}
                        style={{ width: `${liveScore.score}%` }} />
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${liveScore.color}`}>{liveScore.score}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  {liveScore.checks.map((c, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className={c.passed ? "text-emerald-500" : "text-destructive"}>{c.passed ? "✓" : "✗"}</span>
                      <span className={c.passed ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
                    </div>
                  ))}
                </div>
                <div className="border rounded-lg p-3 bg-muted/30 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Search Preview</p>
                  <p className="text-primary text-sm font-medium truncate">{seoForm.seo_title || seoEditPage.title}</p>
                  <p className="text-[11px] text-emerald-700 truncate">example.com/{seoEditPage.slug}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{seoForm.seo_description || "No description."}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">SEO Title <span className="text-muted-foreground">({seoForm.seo_title.length}/60)</span></Label>
                  <Input value={seoForm.seo_title} onChange={(e) => setSeoForm({ ...seoForm, seo_title: e.target.value })} placeholder="Page title for search engines" maxLength={60} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Meta Description <span className="text-muted-foreground">({seoForm.seo_description.length}/160)</span></Label>
                  <Textarea value={seoForm.seo_description} onChange={(e) => setSeoForm({ ...seoForm, seo_description: e.target.value })} placeholder="Compelling description" maxLength={160} rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Keywords <span className="text-muted-foreground">(comma-separated)</span></Label>
                  <Input value={seoForm.seo_keywords} onChange={(e) => setSeoForm({ ...seoForm, seo_keywords: e.target.value })} placeholder="keyword1, keyword2" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSeoEditPage(null)}>Cancel</Button>
                  <Button onClick={() => seoSaveMutation.mutate({ id: seoEditPage.id, ...seoForm })} disabled={seoSaveMutation.isPending}>
                    {seoSaveMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</> : <><Save className="mr-1.5 h-3.5 w-3.5" />Save</>}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Bulk SEO */}
      <Dialog open={bulkSeoOpen} onOpenChange={setBulkSeoOpen}>
        <DialogContent className={bulkSeoMode === "inline" ? "sm:max-w-5xl max-h-[90vh] flex flex-col" : "sm:max-w-lg"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5 text-primary" />Bulk Edit SEO ({selectedIds.size})</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 mt-2">
            <div className="flex gap-2">
              <Button size="sm" variant={bulkSeoMode === "inline" ? "default" : "outline"} onClick={() => setBulkSeoMode("inline")} className="text-xs">
                <Pencil className="h-3 w-3 mr-1.5" />Per-Page
              </Button>
              <Button size="sm" variant={bulkSeoMode === "blanket" ? "default" : "outline"} onClick={() => setBulkSeoMode("blanket")} className="text-xs">
                <Tag className="h-3 w-3 mr-1.5" />Apply to All
              </Button>
            </div>
            {bulkSeoMode === "inline" ? (
              <div className="space-y-3">
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-muted border-b">
                          <th className="text-left p-2 font-medium text-muted-foreground min-w-[160px]">Page</th>
                          <th className="text-left p-2 font-medium text-muted-foreground min-w-[180px]">SEO Title</th>
                          <th className="text-left p-2 font-medium text-muted-foreground min-w-[240px]">Description</th>
                          <th className="text-left p-2 font-medium text-muted-foreground min-w-[140px]">Keywords</th>
                          <th className="text-center p-2 font-medium text-muted-foreground w-14">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedIds].map((id) => {
                          const page = pages.find((p) => p.id === id);
                          if (!page) return null;
                          const edit = inlineSeoEdits[id] || { seo_title: "", seo_description: "", seo_keywords: "" };
                          const liveKw = edit.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean);
                          const liveScore = calculateSeoScore(edit.seo_title, edit.seo_description, liveKw, page.title);
                          return (
                            <tr key={id} className="border-b last:border-0 hover:bg-muted/30">
                              <td className="p-2"><span className="font-medium truncate block max-w-[160px]" title={page.title}>{page.title}</span></td>
                              <td className="p-1.5"><Input value={edit.seo_title} onChange={(e) => setInlineSeoEdits((prev) => ({ ...prev, [id]: { ...edit, seo_title: e.target.value } }))} maxLength={60} className="h-7 text-xs" /></td>
                              <td className="p-1.5"><Input value={edit.seo_description} onChange={(e) => setInlineSeoEdits((prev) => ({ ...prev, [id]: { ...edit, seo_description: e.target.value } }))} maxLength={160} className="h-7 text-xs" /></td>
                              <td className="p-1.5"><Input value={edit.seo_keywords} onChange={(e) => setInlineSeoEdits((prev) => ({ ...prev, [id]: { ...edit, seo_keywords: e.target.value } }))} className="h-7 text-xs" /></td>
                              <td className="p-2 text-center"><span className={`text-xs font-bold tabular-nums ${liveScore.color}`}>{liveScore.score}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setBulkSeoOpen(false)}>Cancel</Button>
                  <Button onClick={() => inlineSeoSaveMutation.mutate(inlineSeoEdits)} disabled={inlineSeoSaveMutation.isPending}>
                    {inlineSeoSaveMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving...</> : <><Save className="mr-1.5 h-3.5 w-3.5" />Save All</>}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Fields to update</p>
                  <div className="flex flex-wrap gap-3">
                    {(["title", "description", "keywords"] as const).map((f) => (
                      <label key={f} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox checked={bulkSeoApply[f]} onCheckedChange={(v) => setBulkSeoApply({ ...bulkSeoApply, [f]: !!v })} />
                        {f === "title" ? "SEO Title" : f === "description" ? "Meta Description" : "Keywords"}
                      </label>
                    ))}
                  </div>
                </div>
                {bulkSeoApply.title && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">SEO Title ({bulkSeoForm.seo_title.length}/60)</Label>
                    <Input value={bulkSeoForm.seo_title} onChange={(e) => setBulkSeoForm({ ...bulkSeoForm, seo_title: e.target.value })} maxLength={60} />
                  </div>
                )}
                {bulkSeoApply.description && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description ({bulkSeoForm.seo_description.length}/160)</Label>
                    <Textarea value={bulkSeoForm.seo_description} onChange={(e) => setBulkSeoForm({ ...bulkSeoForm, seo_description: e.target.value })} maxLength={160} rows={3} />
                  </div>
                )}
                {bulkSeoApply.keywords && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Keywords</Label>
                    <Input value={bulkSeoForm.seo_keywords} onChange={(e) => setBulkSeoForm({ ...bulkSeoForm, seo_keywords: e.target.value })} />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setBulkSeoOpen(false)}>Cancel</Button>
                  <Button onClick={() => bulkSeoSaveMutation.mutate({ ids: [...selectedIds], ...bulkSeoForm, apply: bulkSeoApply })}
                    disabled={bulkSeoSaveMutation.isPending || (!bulkSeoApply.title && !bulkSeoApply.description && !bulkSeoApply.keywords)}>
                    {bulkSeoSaveMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />...</> : <><Save className="mr-1.5 h-3.5 w-3.5" />Update {selectedIds.size}</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Translate */}
      <Dialog open={translateOpen} onOpenChange={setTranslateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Languages className="h-5 w-5 text-primary" />Translate Pages</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Translate {selectedIds.size} page{selectedIds.size !== 1 ? "s" : ""} into a new language.</p>
            <div className="space-y-2">
              <Label>Target Language</Label>
              <Select value={translateLang} onValueChange={setTranslateLang}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[
                    { code: "en", label: "🇬🇧 English" }, { code: "fr", label: "🇫🇷 French" }, { code: "de", label: "🇩🇪 German" },
                    { code: "es", label: "🇪🇸 Spanish" }, { code: "it", label: "🇮🇹 Italian" }, { code: "pt", label: "🇵🇹 Portuguese" },
                    { code: "nl", label: "🇳🇱 Dutch" }, { code: "pl", label: "🇵🇱 Polish" }, { code: "sv", label: "🇸🇪 Swedish" },
                    { code: "da", label: "🇩🇰 Danish" }, { code: "ja", label: "🇯🇵 Japanese" }, { code: "ko", label: "🇰🇷 Korean" },
                    { code: "zh", label: "🇨🇳 Chinese" }, { code: "ar", label: "🇸🇦 Arabic" }, { code: "ru", label: "🇷🇺 Russian" },
                    { code: "tr", label: "🇹🇷 Turkish" }, { code: "hi", label: "🇮🇳 Hindi" },
                  ].map((l) => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTranslateOpen(false)}>Cancel</Button>
              <Button disabled={translateMutation.isPending} onClick={() => translateMutation.mutate({ pageIds: [...selectedIds], lang: translateLang })}>
                {translateMutation.isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Translating...</> : <><Languages className="mr-1.5 h-3.5 w-3.5" />Translate</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* External dialogs */}
      <DuplicateContentDialog open={duplicateOpen} onOpenChange={setDuplicateOpen} pages={pages.map((p) => ({ id: p.id, title: p.title, content: p.content }))} />
      <VisualFidelityDialog
        open={!!fidelityPage}
        onOpenChange={(v) => { if (!v) setFidelityPage(null); }}
        baselineHtml={baselineHtml}
        targetHtml={fidelityPage?.content}
        publishedUrl={fidelityPage?.external_url}
        workspaceId={wsId}
        generatedPageId={fidelityPage?.id}
        templateId={undefined}
      />
      <SeoAnalysisDialog open={!!seoAnalysisPage} onOpenChange={(open) => !open && setSeoAnalysisPage(null)} page={seoAnalysisPage}
        campaignTitles={seoAnalysisPage?.campaign_id ? pages.filter(p => p.campaign_id === seoAnalysisPage.campaign_id).map(p => p.title) : undefined}
        campaignSlugs={seoAnalysisPage?.campaign_id ? pages.filter(p => p.campaign_id === seoAnalysisPage.campaign_id).map(p => p.slug) : undefined}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["generated-pages"] })} />
      <PublishFormatDialog
        open={showFormatDialog}
        onOpenChange={(open) => {
          setShowFormatDialog(open);
          if (!open) setPendingPublishIds([]);
        }}
        pageCount={pendingPublishIds.length}
        defaultFormat={rememberedFormat ?? publishFormat}
        rememberDefault={!!rememberedFormat}
        onConfirm={(format, remember) => {
          setPublishFormat(format);
          persistRememberedFormat(remember ? format : null);
          setShowFormatDialog(false);
          runPublish(pendingPublishIds, pendingPublishAction, format);
        }}
      />
      <PublishWebsiteSelector

        open={showWebsiteSelector}
        onOpenChange={(open) => {
          setShowWebsiteSelector(open);
          if (!open) setPendingPublishIds([]);
        }}
        isPending={publishMutation.isPending || bulkPublishMutation.isPending || retryFailedMutation.isPending}
        pageCount={pendingPublishIds.length}
        onConfirm={handleWebsiteSelected}
      />
      <PublishLogDialog
        open={!!publishLog}
        onOpenChange={(open) => { if (!open) setPublishLog(null); }}
        results={publishLog || []}
      />
      <RepublishDiffDialog
        open={!!diffState}
        onOpenChange={(open) => { if (!open) setDiffState(null); }}
        before={diffState?.before}
        after={diffState?.after}
      />

      <VerificationHistoryDialog
        open={verifyHistoryOpen}
        onOpenChange={setVerifyHistoryOpen}
        workspaceId={wsId}
        title="SEO Apply — Verifications for Generated Pages"
      />



      <BulkBoxSettingsDialog
        open={bulkWidthOpen}
        onOpenChange={setBulkWidthOpen}
        table="generated_pages"
        ids={[...selectedIds]}
        onApplied={() => {
          queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
          setSelectedIds(new Set());
        }}
      />

      <Dialog open={resyncOpen} onOpenChange={setResyncOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Re-sync template globals</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Choose which Elementor globals to reapply to your already-published pages.
          </p>
          <div className="space-y-3 py-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={resyncOptions.colors}
                onCheckedChange={(v) => setResyncOptions((o) => ({ ...o, colors: Boolean(v) }))}
                className="mt-0.5"
              />
              <span>
                <span className="text-sm font-medium">Global Colors</span>
                <span className="block text-xs text-muted-foreground">Reapply the template palette to Site Settings › Global Colors.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={resyncOptions.typography}
                onCheckedChange={(v) => setResyncOptions((o) => ({ ...o, typography: Boolean(v) }))}
                className="mt-0.5"
              />
              <span>
                <span className="text-sm font-medium">Global Typography</span>
                <span className="block text-xs text-muted-foreground">Reapply the template fonts to Site Settings › Global Fonts.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={resyncOptions.site_settings}
                onCheckedChange={(v) => setResyncOptions((o) => ({ ...o, site_settings: Boolean(v) }))}
                className="mt-0.5"
              />
              <span>
                <span className="text-sm font-medium">Site Settings CSS</span>
                <span className="block text-xs text-muted-foreground">Regenerate the Elementor kit + global CSS so changes render live.</span>
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setResyncOpen(false)}>Cancel</Button>
            <Button
              onClick={() => resyncGlobalsMutation.mutate(resyncOptions)}
              disabled={
                resyncGlobalsMutation.isPending ||
                (!resyncOptions.colors && !resyncOptions.typography && !resyncOptions.site_settings)
              }
            >
              {resyncGlobalsMutation.isPending ? "Syncing…" : "Re-sync"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>

  );
}
