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
import { Search, Eye, Trash2, ExternalLink, FileText, Send, Pencil, Tag, Save, Loader2, CheckSquare, X, Download, RefreshCw, ChevronLeft, ChevronRight, RotateCw, ArrowUpDown, Clock, Sparkles, Languages, Copy, Code, BarChart3 } from "lucide-react";
import { DuplicateContentDialog } from "@/components/DuplicateContentDialog";
import { SeoAnalysisDialog } from "@/components/SeoAnalysisDialog";
import { exportPagesCsv, exportPagesJson } from "@/lib/export-csv";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { calculateSeoScore } from "@/lib/seo-score";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";
import { calculateFreshness } from "@/lib/content-freshness";
import { SeoScoreBadge } from "@/components/SeoScoreBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type GeneratedPage = Tables<"generated_pages"> & {
  campaigns?: { name: string } | null;
  websites?: { name: string } | null;
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  published: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
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

  // Selection & bulk SEO
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

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["generated-pages", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("*, campaigns(name), websites(name)")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as GeneratedPage[];
    },
  });

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
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
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
      toast({ title: "Pages deleted", description: `Deleted ${count} pages.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ pageIds, type }: { pageIds: string[]; type: "page" | "product" }) => {
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: { page_ids: pageIds, publish_type: type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      toast({
        title: "Publishing complete",
        description: `${data.published} published, ${data.failed} failed.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Publishing failed", description: err.message, variant: "destructive" });
    },
  });

  const seoSaveMutation = useMutation({
    mutationFn: async ({ id, seo_title, seo_description, seo_keywords }: { id: string; seo_title: string; seo_description: string; seo_keywords: string }) => {
      const keywordsArr = seo_keywords.split(",").map((k) => k.trim()).filter(Boolean);
      const { error } = await supabase
        .from("generated_pages")
        .update({
          seo_title: seo_title || null,
          seo_description: seo_description || null,
          seo_keywords: keywordsArr.length > 0 ? keywordsArr : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setSeoEditPage(null);
      toast({ title: "SEO metadata saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkSeoSaveMutation = useMutation({
    mutationFn: async ({ ids, seo_title, seo_description, seo_keywords, apply }: {
      ids: string[];
      seo_title: string;
      seo_description: string;
      seo_keywords: string;
      apply: { title: boolean; description: boolean; keywords: boolean };
    }) => {
      const keywordsArr = seo_keywords.split(",").map((k) => k.trim()).filter(Boolean);
      const updatePayload: Record<string, any> = {};
      if (apply.title) updatePayload.seo_title = seo_title || null;
      if (apply.description) updatePayload.seo_description = seo_description || null;
      if (apply.keywords) updatePayload.seo_keywords = keywordsArr.length > 0 ? keywordsArr : null;

      if (Object.keys(updatePayload).length === 0) throw new Error("Select at least one field to update");

      const { error } = await supabase
        .from("generated_pages")
        .update(updatePayload)
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setBulkSeoOpen(false);
      setSelectedIds(new Set());
      toast({ title: "Bulk SEO updated", description: `Updated ${count} pages.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const bulkPublishMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: { page_ids: ids, publish_type: publishType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setSelectedIds(new Set());
      toast({
        title: "Bulk publish complete",
        description: `${data.published} published, ${data.failed} failed.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Bulk publish failed", description: err.message, variant: "destructive" });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("generated_pages")
        .update({ status: status as any })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setSelectedIds(new Set());
      toast({ title: "Status updated", description: `${count} pages set to ${status}.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const retryFailedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // First reset status to pending and clear error
      const { error: resetErr } = await supabase
        .from("generated_pages")
        .update({ status: "pending" as any, error_message: null })
        .in("id", ids);
      if (resetErr) throw resetErr;

      // Then publish them
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: { page_ids: ids, publish_type: publishType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      setSelectedIds(new Set());
      toast({
        title: "Retry complete",
        description: `${data.published} published, ${data.failed} failed.`,
      });
    },
    onError: (err: Error) => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: async (pageId: string) => {
      const { data, error } = await supabase.functions.invoke("rewrite-content", {
        body: { page_id: pageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-pages"] });
      toast({ title: "Content rewritten", description: "Page content has been refreshed with AI." });
    },
    onError: (err: Error) => {
      toast({ title: "Rewrite failed", description: err.message, variant: "destructive" });
    },
  });

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
      toast({
        title: "Translation complete",
        description: `${data.translated} page(s) translated, ${data.failed} failed.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Translation failed", description: err.message, variant: "destructive" });
    },
  });

  const openSeoEditor = (page: GeneratedPage) => {
    setSeoEditPage(page);
    setSeoForm({
      seo_title: (page as any).seo_title || "",
      seo_description: (page as any).seo_description || "",
      seo_keywords: ((page as any).seo_keywords || []).join(", "),
    });
  };

  const openBulkSeoEditor = () => {
    setBulkSeoForm({ seo_title: "", seo_description: "", seo_keywords: "" });
    setBulkSeoApply({ title: true, description: true, keywords: true });
    setBulkSeoMode("inline");
    // Pre-populate inline edits from current page data
    const edits: Record<string, { seo_title: string; seo_description: string; seo_keywords: string }> = {};
    for (const id of selectedIds) {
      const page = pages.find((p) => p.id === id);
      if (page) {
        edits[id] = {
          seo_title: (page as any).seo_title || "",
          seo_description: (page as any).seo_description || "",
          seo_keywords: ((page as any).seo_keywords || []).join(", "),
        };
      }
    }
    setInlineSeoEdits(edits);
    setBulkSeoOpen(true);
  };

  const inlineSeoSaveMutation = useMutation({
    mutationFn: async (edits: Record<string, { seo_title: string; seo_description: string; seo_keywords: string }>) => {
      const promises = Object.entries(edits).map(([id, fields]) => {
        const keywordsArr = fields.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean);
        return supabase
          .from("generated_pages")
          .update({
            seo_title: fields.seo_title || null,
            seo_description: fields.seo_description || null,
            seo_keywords: keywordsArr.length > 0 ? keywordsArr : null,
          })
          .eq("id", id);
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
      toast({ title: "SEO updated", description: `Updated ${count} pages individually.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const pendingPages = pages.filter((p) => p.status === "pending");

  // Unique sites and campaigns for filters
  const uniqueSites = useMemo(() => {
    const sites = new Map<string, string>();
    pages.forEach((p) => {
      if (p.website_id && p.websites?.name) sites.set(p.website_id, p.websites.name);
    });
    return Array.from(sites, ([id, name]) => ({ id, name }));
  }, [pages]);

  const uniqueCampaigns = useMemo(() => {
    const campaigns = new Map<string, string>();
    pages.forEach((p) => {
      if (p.campaign_id && p.campaigns?.name) campaigns.set(p.campaign_id, p.campaigns.name);
    });
    return Array.from(campaigns, ([id, name]) => ({ id, name }));
  }, [pages]);

  const filtered = useMemo(() => {
    const base = pages.filter(
      (p) =>
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPages = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  // Reset to page 1 when filters or page size change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, siteFilter, campaignFilter, freshnessFilter, pageSize, sortBy]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-display">Generated Pages</h1>
            <p className="text-muted-foreground mt-1 text-sm">Browse and manage all pages created by your campaigns.</p>
          </div>
          <div className="flex gap-2 items-center">
            {pendingPages.length > 0 && (
              <Button
                size="sm"
                className="bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 transition-all duration-200"
                disabled={publishMutation.isPending}
                onClick={() => publishMutation.mutate({ pageIds: pendingPages.map((p) => p.id), type: publishType })}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {publishMutation.isPending ? "Publishing..." : `Publish (${pendingPages.length})`}
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={publishType} onValueChange={(v) => setPublishType(v as "page" | "product")}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page"><FileText className="h-3 w-3 mr-1 inline" />As Page</SelectItem>
              <SelectItem value="product"><FileText className="h-3 w-3 mr-1 inline" />As Product</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportPagesCsv(filtered, "generated-pages.csv")}
            disabled={filtered.length === 0}
            className="h-8 text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportPagesJson(filtered, "generated-pages.json")}
            disabled={filtered.length === 0}
            className="h-8 text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1" /> JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDuplicateOpen(true)}
            disabled={pages.length < 2}
            className="h-8 text-xs"
          >
            <Copy className="h-3.5 w-3.5 mr-1" /> Duplicates
          </Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1 shrink-0" />
              <SelectValue />
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          {uniqueSites.length > 0 && (
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {uniqueSites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {uniqueCampaigns.length > 0 && (
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                <SelectItem value="direct">Direct Publish</SelectItem>
                {uniqueCampaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={freshnessFilter} onValueChange={setFreshnessFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <Clock className="h-3.5 w-3.5 mr-1 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Freshness</SelectItem>
              <SelectItem value="fresh">Fresh (&lt;30d)</SelectItem>
              <SelectItem value="aging">Aging (30-90d)</SelectItem>
              <SelectItem value="stale">Stale (90-180d)</SelectItem>
              <SelectItem value="outdated">Outdated (&gt;180d)</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Selection action bar */}
      {someSelected && (
        <Card className="shadow-surface border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{selectedIds.size} page{selectedIds.size !== 1 ? "s" : ""} selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-gradient-primary border-0 shadow-lg shadow-primary/25"
                disabled={bulkPublishMutation.isPending}
                onClick={() => {
                  const publishableSelected = [...selectedIds].filter(
                    (id) => {
                      const p = pages.find((pg) => pg.id === id);
                      return p?.status === "pending" || p?.status === "failed";
                    }
                  );
                  if (publishableSelected.length === 0) {
                    toast({ title: "No publishable pages", description: "Select pending or failed pages to publish.", variant: "destructive" });
                    return;
                  }
                  bulkPublishMutation.mutate(publishableSelected);
                }}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {bulkPublishMutation.isPending ? "Publishing..." : "Publish Selected"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkPublishMutation.isPending}
                onClick={() => {
                  const publishedSelected = [...selectedIds].filter(
                    (id) => {
                      const p = pages.find((pg) => pg.id === id);
                      return p?.status === "published" && p?.external_id;
                    }
                  );
                  if (publishedSelected.length === 0) {
                    toast({ title: "No re-publishable pages", description: "Select published pages with an external ID to re-publish.", variant: "destructive" });
                    return;
                  }
                  bulkPublishMutation.mutate(publishedSelected);
                }}
              >
                <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                {bulkPublishMutation.isPending ? "Re-publishing..." : "Re-publish Selected"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={retryFailedMutation.isPending}
                onClick={() => {
                  const failedSelected = [...selectedIds].filter(
                    (id) => pages.find((p) => p.id === id)?.status === "failed"
                  );
                  if (failedSelected.length === 0) {
                    toast({ title: "No failed pages", description: "Only failed pages can be retried.", variant: "destructive" });
                    return;
                  }
                  retryFailedMutation.mutate(failedSelected);
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                {retryFailedMutation.isPending ? "Retrying..." : "Retry Failed"}
              </Button>
              <Button size="sm" variant="outline" onClick={openBulkSeoEditor}>
                <Tag className="h-3.5 w-3.5 mr-1.5" /> Bulk Edit SEO
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTranslateOpen(true)}>
                <Languages className="h-3.5 w-3.5 mr-1.5" /> Translate
              </Button>
              <Select
                onValueChange={(status) => {
                  bulkStatusMutation.mutate({ ids: [...selectedIds], status });
                }}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Set Status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Set Pending</SelectItem>
                  <SelectItem value="published">Set Published</SelectItem>
                  <SelectItem value="failed">Set Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => {
                  if (window.confirm(`Delete ${selectedIds.size} selected page${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`)) {
                    bulkDeleteMutation.mutate([...selectedIds]);
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                <X className="h-3.5 w-3.5 mr-1.5" /> Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: pages.length },
          { label: "Published", value: pages.filter((p) => p.status === "published").length },
          { label: "Pending", value: pages.filter((p) => p.status === "pending").length },
          { label: "Failed", value: pages.filter((p) => p.status === "failed").length },
        ].map((s) => (
          <Card key={s.label} className="shadow-surface">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-semibold tabular-nums mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
        {/* Freshness stats */}
        {(() => {
          const freshCounts = { fresh: 0, aging: 0, stale: 0, outdated: 0 };
          pages.forEach((p) => { freshCounts[calculateFreshness(p.created_at, p.status).level]++; });
          return (
            <Card className="shadow-surface col-span-2 sm:col-span-4">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Clock className="h-3 w-3" /> Content Freshness</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-emerald-600 font-medium">{freshCounts.fresh} Fresh</span>
                  <span className="text-primary font-medium">{freshCounts.aging} Aging</span>
                  <span className="text-amber-600 font-medium">{freshCounts.stale} Stale</span>
                  <span className="text-destructive font-medium">{freshCounts.outdated} Outdated</span>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Table */}
      {isLoading ? (
        <Card className="shadow-surface">
          <CardContent className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            {pages.length === 0
              ? "No generated pages yet. Execute a campaign to create pages."
              : "No pages match your search."}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-4 w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Title</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Slug</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Campaign</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Source</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">CMS ID</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Scores</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">Freshness</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedPages.map((page) => {
                  const displayTitle = page.title?.trim() || (page as any).seo_title?.trim() || page.slug;
                  const seoResult = calculateSeoScore((page as any).seo_title, (page as any).seo_description, (page as any).seo_keywords, displayTitle);
                  const seaResult = calculateContentSeaScore(displayTitle, page.content, page.slug);
                  const geoResult = calculateContentGeoScore(displayTitle, page.content, page.slug);
                  const isSelected = selectedIds.has(page.id);
                  return (
                    <tr
                      key={page.id}
                      className={`border-b last:border-0 transition-colors duration-150 ${
                        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <td className="p-4 w-10">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(page.id)}
                          aria-label={`Select ${displayTitle}`}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                          <span className="font-medium truncate max-w-[200px]">{displayTitle}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{page.slug}</code>
                      </td>
                      <td className="p-4 text-muted-foreground hidden md:table-cell">{page.campaigns?.name || "—"}</td>
                      <td className="p-4 hidden md:table-cell">
                        <Badge variant="outline" className={page.campaign_id ? "border-primary/30 text-primary" : "border-accent/30 text-accent-foreground"}>
                          {page.campaign_id ? "Campaign" : "Direct Publish"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className={statusColors[page.status]}>{page.status}</Badge>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <code className="text-[10px] text-muted-foreground font-mono tabular-nums">{page.external_id || "—"}</code>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-semibold text-muted-foreground">SEO</span>
                            <SeoScoreBadge score={seoResult.score} label={seoResult.label} color={seoResult.color} checks={seoResult.checks} size="sm" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-semibold text-muted-foreground">SEA</span>
                            <SeoScoreBadge score={seaResult.score} label={seaResult.label} color={seaResult.color} checks={seaResult.checks} size="sm" />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-semibold text-muted-foreground">GEO</span>
                            <SeoScoreBadge score={geoResult.score} label={geoResult.label} color={geoResult.color} checks={geoResult.checks} size="sm" />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        {(() => {
                          const freshness = calculateFreshness(page.created_at, page.status);
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className={`text-[10px] ${freshness.color}`}>
                                    {freshness.label} ({freshness.ageDays}d)
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{freshness.tip}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {page.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary"
                              onClick={() => publishMutation.mutate({ pageIds: [page.id], type: publishType })}
                              disabled={publishMutation.isPending}
                              title="Publish"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          {page.status === "published" && page.external_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary"
                              onClick={() => publishMutation.mutate({ pageIds: [page.id], type: publishType })}
                              disabled={publishMutation.isPending}
                              title="Re-publish (update on CMS)"
                            >
                              <RotateCw className="h-3 w-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openSeoEditor(page)} title="Edit SEO">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setJsonPayloadPage(page)} title="View JSON payload">
                            <Code className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setSeoAnalysisPage(page)} title="SEO Analysis">
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setPreviewPage(page)} title="Preview">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-primary"
                                  onClick={() => rewriteMutation.mutate(page.id)}
                                  disabled={rewriteMutation.isPending}
                                  title="AI Rewrite"
                                >
                                  <Sparkles className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Refresh content with AI</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {page.status === "failed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-warning"
                              onClick={() => retryFailedMutation.mutate([page.id])}
                              disabled={retryFailedMutation.isPending}
                              title="Retry publish"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          {page.status === "failed" && page.error_message && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-[9px] text-destructive border-destructive/30 max-w-[120px] truncate cursor-help">
                                    {page.error_message}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">{page.error_message}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {page.external_url && (
                            <>
                              <Button size="sm" variant="ghost" asChild title="Open live page">
                                <a href={page.external_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(page.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                </p>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-[70px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">per page</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(safePage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (safePage <= 4) {
                    pageNum = i + 1;
                  } else if (safePage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = safePage - 3 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === safePage ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(safePage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewPage} onOpenChange={(open) => !open && setPreviewPage(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewPage?.title}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Slug: <code className="bg-muted px-1.5 py-0.5 rounded">{previewPage?.slug}</code>
            </p>
          </DialogHeader>

          {previewPage && ((previewPage as any).seo_title || (previewPage as any).seo_description) && (
            <div className="mt-2 border rounded-lg p-4 bg-muted/30 space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> SEO Preview
              </p>
              <div className="space-y-1">
                <p className="text-primary text-sm font-medium leading-tight">
                  {(previewPage as any).seo_title || previewPage.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {(previewPage as any).seo_description || "No meta description set."}
                </p>
                {(previewPage as any).seo_keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(previewPage as any).seo_keywords.map((kw: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OG Preview */}
          {previewPage && (previewPage as any).seo_title && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Open Graph Preview
              </p>
              <div className="rounded-md border border-border overflow-hidden bg-background">
                <div className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground truncate">
                    {previewPage.external_url || "example.com"}
                  </p>
                  <p className="text-sm font-semibold leading-tight">
                    {(previewPage as any).seo_title || previewPage.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {(previewPage as any).seo_description || ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 border rounded-lg p-6 bg-muted/30">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewPage?.content || "" }}
            />
          </div>
          {previewPage?.error_message && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <strong>Error:</strong> {previewPage.error_message}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* JSON Payload Dialog */}
      <Dialog open={!!jsonPayloadPage} onOpenChange={(open) => !open && setJsonPayloadPage(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              JSON Payload
            </DialogTitle>
          </DialogHeader>
          {jsonPayloadPage && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Raw data for <span className="font-medium text-foreground">{jsonPayloadPage.title}</span>
              </p>
              <div className="relative">
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2 h-7 text-xs z-10"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(jsonPayloadPage, null, 2));
                    toast({ title: "Copied to clipboard" });
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-[50vh] whitespace-pre-wrap break-all">
                  {JSON.stringify({
                    id: jsonPayloadPage.id,
                    title: jsonPayloadPage.title,
                    slug: jsonPayloadPage.slug,
                    status: jsonPayloadPage.status,
                    external_id: jsonPayloadPage.external_id,
                    external_url: jsonPayloadPage.external_url,
                    seo_title: (jsonPayloadPage as any).seo_title,
                    seo_description: (jsonPayloadPage as any).seo_description,
                    seo_keywords: (jsonPayloadPage as any).seo_keywords,
                    canonical_url: jsonPayloadPage.canonical_url,
                    campaign_id: jsonPayloadPage.campaign_id,
                    website_id: jsonPayloadPage.website_id,
                    content: jsonPayloadPage.content,
                    error_message: jsonPayloadPage.error_message,
                    created_at: jsonPayloadPage.created_at,
                  }, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single SEO Edit Dialog */}
      <Dialog open={!!seoEditPage} onOpenChange={(open) => !open && setSeoEditPage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Edit SEO Metadata
            </DialogTitle>
          </DialogHeader>
          {seoEditPage && (() => {
            const liveKeywords = seoForm.seo_keywords.split(",").map(k => k.trim()).filter(Boolean);
            const liveScore = calculateSeoScore(seoForm.seo_title, seoForm.seo_description, liveKeywords, seoEditPage.title);
            return (
            <div className="space-y-4 mt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Page: <span className="font-medium text-foreground">{seoEditPage.title}</span>
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        liveScore.score >= 85 ? "bg-emerald-500" :
                        liveScore.score >= 60 ? "bg-primary" :
                        liveScore.score >= 35 ? "bg-amber-500" : "bg-destructive"
                      }`}
                      style={{ width: `${liveScore.score}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold tabular-nums ${liveScore.color}`}>
                    {liveScore.score}
                  </span>
                </div>
              </div>

              {/* Live checklist */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                {liveScore.checks.map((c, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className={c.passed ? "text-emerald-500" : "text-destructive"}>{c.passed ? "✓" : "✗"}</span>
                    <span className={c.passed ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
                  </div>
                ))}
              </div>

              <div className="border rounded-lg p-4 bg-muted/30 space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Search preview</p>
                <p className="text-primary text-sm font-medium leading-tight truncate">
                  {seoForm.seo_title || seoEditPage.title}
                </p>
                <p className="text-[11px] text-emerald-700 truncate">
                  example.com/{seoEditPage.slug}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {seoForm.seo_description || "No meta description set."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  SEO Title
                  <span className="text-muted-foreground ml-1">({seoForm.seo_title.length}/60)</span>
                </Label>
                <Input
                  value={seoForm.seo_title}
                  onChange={(e) => setSeoForm({ ...seoForm, seo_title: e.target.value })}
                  placeholder="Optimized page title for search engines"
                  maxLength={60}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Meta Description
                  <span className="text-muted-foreground ml-1">({seoForm.seo_description.length}/160)</span>
                </Label>
                <Textarea
                  value={seoForm.seo_description}
                  onChange={(e) => setSeoForm({ ...seoForm, seo_description: e.target.value })}
                  placeholder="Compelling description for search results"
                  maxLength={160}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Keywords <span className="text-muted-foreground">(comma-separated)</span></Label>
                <Input
                  value={seoForm.seo_keywords}
                  onChange={(e) => setSeoForm({ ...seoForm, seo_keywords: e.target.value })}
                  placeholder="e.g., plumbing, new york, emergency service"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSeoEditPage(null)}>Cancel</Button>
                <Button
                  onClick={() => seoSaveMutation.mutate({ id: seoEditPage.id, ...seoForm })}
                  disabled={seoSaveMutation.isPending}
                >
                  {seoSaveMutation.isPending ? (
                    <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="mr-1.5 h-3.5 w-3.5" /> Save SEO</>
                  )}
                </Button>
              </div>
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Bulk SEO Edit Dialog — Enhanced */}
      <Dialog open={bulkSeoOpen} onOpenChange={setBulkSeoOpen}>
        <DialogContent className={bulkSeoMode === "inline" ? "sm:max-w-5xl max-h-[90vh] overflow-y-auto" : "sm:max-w-lg"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Bulk Edit SEO ({selectedIds.size} pages)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={bulkSeoMode === "inline" ? "default" : "outline"}
                onClick={() => setBulkSeoMode("inline")}
                className="text-xs"
              >
                <Pencil className="h-3 w-3 mr-1.5" /> Per-Page Editor
              </Button>
              <Button
                size="sm"
                variant={bulkSeoMode === "blanket" ? "default" : "outline"}
                onClick={() => setBulkSeoMode("blanket")}
                className="text-xs"
              >
                <Tag className="h-3 w-3 mr-1.5" /> Apply Same to All
              </Button>
            </div>

            {bulkSeoMode === "inline" ? (
              /* Inline spreadsheet editor */
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Edit SEO fields for each page individually. Changes are saved all at once.
                </p>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-muted border-b">
                          <th className="text-left p-2 font-medium text-muted-foreground min-w-[180px]">Page Title</th>
                          <th className="text-left p-2 font-medium text-muted-foreground min-w-[200px]">
                            SEO Title <span className="text-muted-foreground/50">(60)</span>
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground min-w-[260px]">
                            Meta Description <span className="text-muted-foreground/50">(160)</span>
                          </th>
                          <th className="text-left p-2 font-medium text-muted-foreground min-w-[160px]">Keywords</th>
                          <th className="text-center p-2 font-medium text-muted-foreground w-16">Score</th>
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
                              <td className="p-2">
                                <span className="font-medium truncate block max-w-[180px]" title={page.title}>{page.title}</span>
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={edit.seo_title}
                                  onChange={(e) => setInlineSeoEdits((prev) => ({
                                    ...prev,
                                    [id]: { ...edit, seo_title: e.target.value },
                                  }))}
                                  placeholder="SEO title..."
                                  maxLength={60}
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={edit.seo_description}
                                  onChange={(e) => setInlineSeoEdits((prev) => ({
                                    ...prev,
                                    [id]: { ...edit, seo_description: e.target.value },
                                  }))}
                                  placeholder="Meta description..."
                                  maxLength={160}
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={edit.seo_keywords}
                                  onChange={(e) => setInlineSeoEdits((prev) => ({
                                    ...prev,
                                    [id]: { ...edit, seo_keywords: e.target.value },
                                  }))}
                                  placeholder="keyword1, keyword2..."
                                  className="h-7 text-xs"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <span className={`text-xs font-bold tabular-nums ${liveScore.color}`}>
                                  {liveScore.score}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setBulkSeoOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => inlineSeoSaveMutation.mutate(inlineSeoEdits)}
                    disabled={inlineSeoSaveMutation.isPending}
                  >
                    {inlineSeoSaveMutation.isPending ? (
                      <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="mr-1.5 h-3.5 w-3.5" /> Save All Changes</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Blanket apply mode (existing behavior) */
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Set the same SEO metadata for all selected pages. Use variables like <code className="font-mono bg-muted px-1 py-0.5 rounded text-primary">{"{title}"}</code> as pattern references.
                </p>

                <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Fields to update</p>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox
                        checked={bulkSeoApply.title}
                        onCheckedChange={(v) => setBulkSeoApply({ ...bulkSeoApply, title: !!v })}
                      />
                      SEO Title
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox
                        checked={bulkSeoApply.description}
                        onCheckedChange={(v) => setBulkSeoApply({ ...bulkSeoApply, description: !!v })}
                      />
                      Meta Description
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox
                        checked={bulkSeoApply.keywords}
                        onCheckedChange={(v) => setBulkSeoApply({ ...bulkSeoApply, keywords: !!v })}
                      />
                      Keywords
                    </label>
                  </div>
                </div>

                {bulkSeoApply.title && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      SEO Title
                      <span className="text-muted-foreground ml-1">({bulkSeoForm.seo_title.length}/60)</span>
                    </Label>
                    <Input
                      value={bulkSeoForm.seo_title}
                      onChange={(e) => setBulkSeoForm({ ...bulkSeoForm, seo_title: e.target.value })}
                      placeholder="e.g., Best {service} in {location}"
                      maxLength={60}
                    />
                  </div>
                )}

                {bulkSeoApply.description && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Meta Description
                      <span className="text-muted-foreground ml-1">({bulkSeoForm.seo_description.length}/160)</span>
                    </Label>
                    <Textarea
                      value={bulkSeoForm.seo_description}
                      onChange={(e) => setBulkSeoForm({ ...bulkSeoForm, seo_description: e.target.value })}
                      placeholder="e.g., Discover professional {service} services in {location}."
                      maxLength={160}
                      rows={3}
                    />
                  </div>
                )}

                {bulkSeoApply.keywords && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Keywords <span className="text-muted-foreground">(comma-separated)</span></Label>
                    <Input
                      value={bulkSeoForm.seo_keywords}
                      onChange={(e) => setBulkSeoForm({ ...bulkSeoForm, seo_keywords: e.target.value })}
                      placeholder="e.g., plumbing, new york, emergency service"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setBulkSeoOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() =>
                      bulkSeoSaveMutation.mutate({
                        ids: [...selectedIds],
                        ...bulkSeoForm,
                        apply: bulkSeoApply,
                      })
                    }
                    disabled={bulkSeoSaveMutation.isPending || (!bulkSeoApply.title && !bulkSeoApply.description && !bulkSeoApply.keywords)}
                  >
                    {bulkSeoSaveMutation.isPending ? (
                      <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Updating...</>
                    ) : (
                      <><Save className="mr-1.5 h-3.5 w-3.5" /> Update {selectedIds.size} Pages</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Translate Dialog */}
      <Dialog open={translateOpen} onOpenChange={setTranslateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-primary" />
              Translate Pages
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Translate {selectedIds.size} selected page{selectedIds.size !== 1 ? "s" : ""} into a new language. Translated copies will be created as new pages.
            </p>
            <div className="space-y-2">
              <Label>Target Language</Label>
              <Select value={translateLang} onValueChange={setTranslateLang}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[
                    { code: "fr", label: "🇫🇷 French" },
                    { code: "de", label: "🇩🇪 German" },
                    { code: "es", label: "🇪🇸 Spanish" },
                    { code: "it", label: "🇮🇹 Italian" },
                    { code: "pt", label: "🇵🇹 Portuguese" },
                    { code: "nl", label: "🇳🇱 Dutch" },
                    { code: "pl", label: "🇵🇱 Polish" },
                    { code: "sv", label: "🇸🇪 Swedish" },
                    { code: "da", label: "🇩🇰 Danish" },
                    { code: "ja", label: "🇯🇵 Japanese" },
                    { code: "ko", label: "🇰🇷 Korean" },
                    { code: "zh", label: "🇨🇳 Chinese" },
                    { code: "ar", label: "🇸🇦 Arabic" },
                    { code: "ru", label: "🇷🇺 Russian" },
                    { code: "tr", label: "🇹🇷 Turkish" },
                    { code: "hi", label: "🇮🇳 Hindi" },
                    { code: "en", label: "🇬🇧 English" },
                  ].map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTranslateOpen(false)}>Cancel</Button>
              <Button
                disabled={translateMutation.isPending}
                onClick={() => translateMutation.mutate({ pageIds: [...selectedIds], lang: translateLang })}
              >
                {translateMutation.isPending ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Translating...</>
                ) : (
                  <><Languages className="mr-1.5 h-3.5 w-3.5" /> Translate {selectedIds.size} Page{selectedIds.size !== 1 ? "s" : ""}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DuplicateContentDialog
        open={duplicateOpen}
        onOpenChange={setDuplicateOpen}
        pages={pages.map((p) => ({ id: p.id, title: p.title, content: p.content }))}
      />

      <SeoAnalysisDialog
        open={!!seoAnalysisPage}
        onOpenChange={(open) => !open && setSeoAnalysisPage(null)}
        page={seoAnalysisPage}
        campaignTitles={seoAnalysisPage?.campaign_id ? pages.filter(p => p.campaign_id === seoAnalysisPage.campaign_id).map(p => p.title) : undefined}
        campaignSlugs={seoAnalysisPage?.campaign_id ? pages.filter(p => p.campaign_id === seoAnalysisPage.campaign_id).map(p => p.slug) : undefined}
      />

    </div>
  );
}
