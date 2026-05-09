import { useState, useMemo, useEffect } from "react";
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
  MoreVertical, Globe, TrendingUp, AlertCircle, CheckCircle2, Activity, Send as SendIcon
} from "lucide-react";
import { LiveGenerationProgress } from "@/components/generated-pages/LiveGenerationProgress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DuplicateContentDialog } from "@/components/DuplicateContentDialog";
import { SeoAnalysisDialog } from "@/components/SeoAnalysisDialog";
import { PublishWebsiteSelector } from "@/components/campaigns/PublishWebsiteSelector";
import { exportPagesCsv, exportPagesJson, exportDataFile } from "@/lib/export-csv";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { calculateSeoScore } from "@/lib/seo-score";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";
import { calculateFreshness } from "@/lib/content-freshness";
import { ScoresBadgeGroup } from "@/components/ScoresBadgeGroup";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { logAudit } from "@/lib/audit";
import { useLanguage } from "@/i18n/LanguageContext";

type GeneratedPage = Tables<"generated_pages"> & {
  campaigns?: { name: string; publish_type?: string | null } | null;
  websites?: { name: string; type?: string | null } | null;
};

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  queued:     { icon: Clock,         color: "text-muted-foreground", bg: "bg-muted text-muted-foreground border-border", label: "Queued" },
  pending:    { icon: Clock,         color: "text-amber-500",        bg: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "Pending" },
  generating: { icon: Loader2,       color: "text-primary",          bg: "bg-primary/10 text-primary border-primary/20", label: "Generating" },
  publishing: { icon: SendIcon,      color: "text-blue-500",         bg: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Publishing" },
  published:  { icon: CheckCircle2,  color: "text-emerald-500",      bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Published" },
  done:       { icon: CheckCircle2,  color: "text-emerald-500",      bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Done" },
  failed:     { icon: AlertCircle,   color: "text-destructive",      bg: "bg-destructive/10 text-destructive border-destructive/20", label: "Failed" },
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

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
  const [seoAnalysisPage, setSeoAnalysisPage] = useState<GeneratedPage | null>(null);
  const [showWebsiteSelector, setShowWebsiteSelector] = useState(false);
  const [pendingPublishIds, setPendingPublishIds] = useState<string[]>([]);
  const [pendingPublishAction, setPendingPublishAction] = useState<"publish" | "bulk" | "retry">("publish");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { t } = useLanguage();
  const wsId = currentWorkspace?.id;

  const getPublishFailureMessage = (data: any, fallback: string) => {
    const firstError = data?.results?.find((result: any) => result.status === "failed")?.error;
    return firstError || fallback;
  };

  // ─── Data Query ────────────────────────────────────────────
  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["generated-pages", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("*, campaigns(name, publish_type), websites(name, type)")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GeneratedPage[];
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
      .channel(`generated-pages-${wsId}`)
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
            if (next.status === "published") {
              toast({
                title: "Page published",
                description: next.external_url ? `Live at ${next.external_url}` : next.title,
              });
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
    mutationFn: async ({ pageIds, type, websiteId }: { pageIds: string[]; type: "page" | "product"; websiteId?: string }) => {
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: { page_ids: pageIds, publish_type: type, website_id: websiteId },
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
      if (wsId) logAudit(wsId, "page_published", "page", variables.pageIds[0], { count: variables.pageIds.length });
      setShowWebsiteSelector(false);
      setPendingPublishIds([]);
    },
    onError: (err: Error) => toast({ title: "Publishing failed", description: err.message, variant: "destructive" }),
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
      const { error } = await supabase.from("generated_pages").update(updatePayload).in("id", ids);
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
    mutationFn: async ({ ids, websiteId, type }: { ids: string[]; websiteId?: string; type?: "page" | "product" }) => {
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: { page_ids: ids, publish_type: type ?? publishType, website_id: websiteId },
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
      if (wsId) logAudit(wsId, "pages_bulk_published", "page", null, { count: ids.length, published: data.published });
      setShowWebsiteSelector(false);
      setPendingPublishIds([]);
    },
    onError: (err: Error) => toast({ title: "Bulk publish failed", description: err.message, variant: "destructive" }),
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
    mutationFn: async ({ ids, websiteId }: { ids: string[]; websiteId?: string }) => {
      const { error: resetErr } = await supabase.from("generated_pages")
        .update({ status: "pending" as any, error_message: null }).in("id", ids);
      if (resetErr) throw resetErr;
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: { page_ids: ids, publish_type: publishType, website_id: websiteId },
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
      setShowWebsiteSelector(false);
      setPendingPublishIds([]);
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
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
  const handlePublish = (ids: string[], action: "publish" | "bulk" | "retry") => {
    const pagesWithoutSite = ids.filter((pid) => {
      const p = pages.find((pg) => pg.id === pid);
      return !p?.website_id;
    });
    const effType = resolvePublishTypeFor(ids);
    if (pagesWithoutSite.length > 0) {
      setPendingPublishIds(ids);
      setPendingPublishAction(action);
      setShowWebsiteSelector(true);
    } else {
      if (action === "retry") retryFailedMutation.mutate({ ids, type: effType });
      else if (action === "bulk") bulkPublishMutation.mutate({ ids, type: effType });
      else publishMutation.mutate({ pageIds: ids, type: effType });
    }
  };

  const handleWebsiteSelected = (websiteId: string) => {
    const effType = resolvePublishTypeFor(pendingPublishIds);
    if (pendingPublishAction === "retry") retryFailedMutation.mutate({ ids: pendingPublishIds, websiteId, type: effType });
    else if (pendingPublishAction === "bulk") bulkPublishMutation.mutate({ ids: pendingPublishIds, websiteId, type: effType });
    else publishMutation.mutate({ pageIds: pendingPublishIds, type: effType, websiteId });
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

  const pendingPages = pages.filter((p) => p.status === "pending");

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
      (p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.slug.toLowerCase().includes(search.toLowerCase()) ||
        (p.campaigns?.name || "").toLowerCase().includes(search.toLowerCase()))
    );
    if (sortBy === "newest") return base;
    if (sortBy === "oldest") return [...base].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sortBy === "freshness") return [...base].sort((a, b) => calculateFreshness(b.created_at, b.status).ageDays - calculateFreshness(a.created_at, a.status).ageDays);
    const scoreGetter = (p: GeneratedPage) => {
      if (sortBy === "seo_asc" || sortBy === "seo_desc") return calculateContentSeoScore(p.title, p.content, p.slug).score;
      if (sortBy === "sea_asc" || sortBy === "sea_desc") return calculateContentSeaScore(p.title, p.content, p.slug).score;
      if (sortBy === "geo_asc" || sortBy === "geo_desc") return calculateContentGeoScore(p.title, p.content, p.slug).score;
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

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, siteFilter, campaignFilter, freshnessFilter, pageSize, sortBy]);

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
              {publishMutation.isPending ? "Publishing..." : `Publish All (${pendingPages.length})`}
            </Button>
          )}
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Live progress card (only renders when active jobs exist) */}
      {wsId && <LiveGenerationProgress workspaceId={wsId} />}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Pages", value: stats.total, icon: FileText, color: "text-foreground" },
          { label: "Published", value: stats.published, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "In Progress", value: stats.active, icon: Activity, color: "text-primary" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500" },
          { label: "Failed", value: stats.failed, icon: AlertCircle, color: "text-destructive" },
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
              <TrendingUp className="h-3 w-3" /> Freshness
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-emerald-500 font-medium">{freshCounts.fresh} Fresh</span>
              <span className="text-primary font-medium">{freshCounts.aging} Aging</span>
              <span className="text-amber-500 font-medium">{freshCounts.stale} Stale</span>
              <span className="text-destructive font-medium">{freshCounts.outdated} Old</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search pages..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="generating">Generating</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="publishing">Publishing</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        {uniqueSites.length > 0 && (
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="All Sites" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {uniqueSites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {uniqueCampaigns.length > 0 && (
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue placeholder="All Campaigns" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              <SelectItem value="direct">Direct Publish</SelectItem>
              {uniqueCampaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={freshnessFilter} onValueChange={setFreshnessFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <Clock className="h-3.5 w-3.5 mr-1.5 shrink-0" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Freshness</SelectItem>
            <SelectItem value="fresh">Fresh (&lt;30d)</SelectItem>
            <SelectItem value="aging">Aging (30-90d)</SelectItem>
            <SelectItem value="stale">Stale (90-180d)</SelectItem>
            <SelectItem value="outdated">Outdated (&gt;180d)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 shrink-0" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="freshness">Stalest first</SelectItem>
            <SelectItem value="seo_desc">SEO ↓ (best)</SelectItem>
            <SelectItem value="seo_asc">SEO ↑ (worst)</SelectItem>
            <SelectItem value="sea_desc">SEA ↓ (best)</SelectItem>
            <SelectItem value="sea_asc">SEA ↑ (worst)</SelectItem>
            <SelectItem value="geo_desc">GEO ↓ (best)</SelectItem>
            <SelectItem value="geo_asc">GEO ↑ (worst)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Bar */}
      {someSelected && (
        <Card className="border-primary/30 bg-primary/5 shadow-surface">
          <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{selectedIds.size} selected</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" className="h-7 text-xs bg-gradient-primary border-0" disabled={bulkPublishMutation.isPending}
                onClick={() => {
                  const publishable = [...selectedIds].filter((id) => { const p = pages.find((pg) => pg.id === id); return p?.status === "pending" || p?.status === "failed"; });
                  if (!publishable.length) { toast({ title: "No publishable pages", variant: "destructive" }); return; }
                  handlePublish(publishable, "bulk");
                }}>
                <Send className="h-3 w-3 mr-1" />{bulkPublishMutation.isPending ? "..." : "Publish"}
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={retryFailedMutation.isPending}
                onClick={() => {
                  const failed = [...selectedIds].filter((id) => pages.find((p) => p.id === id)?.status === "failed");
                  if (!failed.length) { toast({ title: "No failed pages to retry", variant: "destructive" }); return; }
                  handlePublish(failed, "retry");
                }}>
                <RefreshCw className="h-3 w-3 mr-1" />Retry
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openBulkSeoEditor}>
                <Tag className="h-3 w-3 mr-1" />SEO
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setTranslateOpen(true)}>
                <Languages className="h-3 w-3 mr-1" />Translate
              </Button>
              <Select onValueChange={(status) => bulkStatusMutation.mutate({ ids: [...selectedIds], status })}>
                <SelectTrigger className="h-7 w-[100px] text-xs"><SelectValue placeholder="Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => { if (window.confirm(`Delete ${selectedIds.size} pages?`)) bulkDeleteMutation.mutate([...selectedIds]); }}
                disabled={bulkDeleteMutation.isPending}>
                <Trash2 className="h-3 w-3 mr-1" />Delete
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
              return (
                <div key={page.id} className={`p-4 flex items-start gap-3 ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"} transition-colors`}>
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(page.id)} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{displayTitle}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className={`text-[10px] ${cfg.bg} inline-flex items-center gap-1`}>
                        <cfg.icon className={`h-2.5 w-2.5 ${page.status === "generating" || page.status === "publishing" ? "animate-spin" : ""}`} />
                        {cfg.label}
                      </Badge>
                      {page.campaigns?.name && <Badge variant="outline" className="text-[10px]">{page.campaigns.name}</Badge>}
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground truncate max-w-[180px]">{page.slug}</code>
                    </div>
                    <ScoresBadgeGroup title={page.title} content={page.content} slug={page.slug} size="sm" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setPreviewPage(page)}><Eye className="h-3.5 w-3.5 mr-2" />Preview</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openSeoEditor(page)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit Content</DropdownMenuItem>
                      {page.status === "pending" && <DropdownMenuItem onClick={() => handlePublish([page.id], "publish")}><Send className="h-3.5 w-3.5 mr-2" />Publish</DropdownMenuItem>}
                      {page.status === "published" && page.external_id && <DropdownMenuItem onClick={() => handlePublish([page.id], "publish")}><RotateCw className="h-3.5 w-3.5 mr-2" />Re-publish</DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => setSeoAnalysisPage(page)}><BarChart3 className="h-3.5 w-3.5 mr-2" />SEO Analysis</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setJsonPayloadPage(page)}><Code className="h-3.5 w-3.5 mr-2" />View JSON</DropdownMenuItem>
                      {page.status === "failed" && <DropdownMenuItem onClick={() => handlePublish([page.id], "retry")}><RefreshCw className="h-3.5 w-3.5 mr-2" />Retry</DropdownMenuItem>}
                      {page.external_url && <DropdownMenuItem asChild><a href={page.external_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-2" />Open Live</a></DropdownMenuItem>}
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
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs">Page</th>
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs w-24">Status</th>
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs w-32 hidden xl:table-cell">Campaign</th>
                  <th className="p-3 text-left font-medium text-muted-foreground text-xs w-32 hidden 2xl:table-cell">Slug</th>
                  <th className="p-3 text-center font-medium text-muted-foreground text-xs w-36">Scores</th>
                  <th className="p-3 text-right font-medium text-muted-foreground text-xs w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPages.map((page) => {
                  const displayTitle = page.title?.trim() || page.seo_title?.trim() || page.slug;
                  const isSelected = selectedIds.has(page.id);
                  const cfg = STATUS_CONFIG[page.status] || STATUS_CONFIG.pending;
                  const freshness = calculateFreshness(page.created_at, page.status);
                  return (
                    <tr key={page.id} className={`border-b last:border-0 ${isSelected ? "bg-primary/5" : "hover:bg-muted/20"} transition-colors`}>
                      <td className="p-3"><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(page.id)} /></td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate max-w-[300px]">{displayTitle}</span>
                            {page.external_url && (
                              <a href={page.external_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary shrink-0">
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
                          {cfg.label}
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
                        <ScoresBadgeGroup title={page.title} content={page.content} slug={page.slug} size="sm" />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-0.5 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openSeoEditor(page)} title="Edit Content">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreviewPage(page)} title="Preview">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {page.status === "pending" && <DropdownMenuItem onClick={() => handlePublish([page.id], "publish")}><Send className="h-3.5 w-3.5 mr-2" />Publish</DropdownMenuItem>}
                              {page.status === "published" && page.external_id && <DropdownMenuItem onClick={() => handlePublish([page.id], "publish")}><RotateCw className="h-3.5 w-3.5 mr-2" />Re-publish</DropdownMenuItem>}
                              <DropdownMenuItem onClick={() => setSeoAnalysisPage(page)}><BarChart3 className="h-3.5 w-3.5 mr-2" />SEO Analysis</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setJsonPayloadPage(page)}><Code className="h-3.5 w-3.5 mr-2" />View JSON</DropdownMenuItem>
                              {page.status === "failed" && <DropdownMenuItem onClick={() => handlePublish([page.id], "retry")}><RefreshCw className="h-3.5 w-3.5 mr-2" />Retry</DropdownMenuItem>}
                              {page.external_url && <DropdownMenuItem asChild><a href={page.external_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-2" />Open live</a></DropdownMenuItem>}
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
      <SeoAnalysisDialog open={!!seoAnalysisPage} onOpenChange={(open) => !open && setSeoAnalysisPage(null)} page={seoAnalysisPage}
        campaignTitles={seoAnalysisPage?.campaign_id ? pages.filter(p => p.campaign_id === seoAnalysisPage.campaign_id).map(p => p.title) : undefined}
        campaignSlugs={seoAnalysisPage?.campaign_id ? pages.filter(p => p.campaign_id === seoAnalysisPage.campaign_id).map(p => p.slug) : undefined}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["generated-pages"] })} />
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
    </div>
  );
}
