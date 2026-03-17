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
import { Search, Eye, Trash2, ExternalLink, FileText, Send, Pencil, Tag, Save, Loader2, CheckSquare, X, ShoppingBag, MessageSquareText, Download, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { exportPagesCsv, exportPagesJson } from "@/lib/export-csv";
import SocialShareButtons from "@/components/SocialShareButtons";
import SocialCaptionDialog from "@/components/SocialCaptionDialog";
import BulkCaptionDialog from "@/components/BulkCaptionDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { calculateSeoScore } from "@/lib/seo-score";
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
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewPage, setPreviewPage] = useState<GeneratedPage | null>(null);
  const [seoEditPage, setSeoEditPage] = useState<GeneratedPage | null>(null);
  const [seoForm, setSeoForm] = useState({ seo_title: "", seo_description: "", seo_keywords: "" });

  // Selection & bulk SEO
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSeoOpen, setBulkSeoOpen] = useState(false);
  const [bulkSeoForm, setBulkSeoForm] = useState({ seo_title: "", seo_description: "", seo_keywords: "" });
  const [bulkSeoApply, setBulkSeoApply] = useState({ title: true, description: true, keywords: true });
  const [publishType, setPublishType] = useState<"page" | "product">("page");
  const [captionPage, setCaptionPage] = useState<GeneratedPage | null>(null);
  const [bulkCaptionOpen, setBulkCaptionOpen] = useState(false);

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
    setBulkSeoOpen(true);
  };

  const pendingPages = pages.filter((p) => p.status === "pending");

  const filtered = useMemo(() => pages.filter(
    (p) =>
      (statusFilter === "all" || p.status === statusFilter) &&
      (p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      (p.campaigns?.name || "").toLowerCase().includes(search.toLowerCase()))
  ), [pages, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPages = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  // Reset to page 1 when filters or page size change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, pageSize]);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display">Generated Pages</h1>
          <p className="text-muted-foreground mt-1">Browse and manage all pages created by your campaigns.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto items-center">
          <Select value={publishType} onValueChange={(v) => setPublishType(v as "page" | "product")}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="page"><FileText className="h-3 w-3 mr-1 inline" />As Page</SelectItem>
              <SelectItem value="product"><ShoppingBag className="h-3 w-3 mr-1 inline" />As Product</SelectItem>
            </SelectContent>
          </Select>
          {pendingPages.length > 0 && (
            <Button
              size="sm"
              className="bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 transition-all duration-200"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate({ pageIds: pendingPages.map((p) => p.id), type: publishType })}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {publishMutation.isPending ? "Publishing..." : `Publish All (${pendingPages.length})`}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportPagesCsv(filtered, "generated-pages.csv")}
            disabled={filtered.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
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
                  const pendingSelected = [...selectedIds].filter(
                    (id) => pages.find((p) => p.id === id)?.status === "pending"
                  );
                  if (pendingSelected.length === 0) {
                    toast({ title: "No pending pages", description: "Only pending pages can be published.", variant: "destructive" });
                    return;
                  }
                  bulkPublishMutation.mutate(pendingSelected);
                }}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {bulkPublishMutation.isPending ? "Publishing..." : "Publish Selected"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkStatusMutation.isPending}
                onClick={() => {
                  const failedSelected = [...selectedIds].filter(
                    (id) => pages.find((p) => p.id === id)?.status === "failed"
                  );
                  if (failedSelected.length === 0) {
                    toast({ title: "No failed pages", description: "Only failed pages can be reset for re-generation.", variant: "destructive" });
                    return;
                  }
                  bulkStatusMutation.mutate({ ids: failedSelected, status: "pending" });
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                {bulkStatusMutation.isPending ? "Resetting..." : "Re-queue Failed"}
              </Button>
              <Button size="sm" variant="outline" onClick={openBulkSeoEditor}>
                <Tag className="h-3.5 w-3.5 mr-1.5" /> Bulk Edit SEO
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBulkCaptionOpen(true)}>
                <MessageSquareText className="h-3.5 w-3.5 mr-1.5" /> Bulk Captions
              </Button>
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
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">SEO</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedPages.map((page) => {
                  const seoResult = calculateSeoScore((page as any).seo_title, (page as any).seo_description, (page as any).seo_keywords, page.title);
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
                          aria-label={`Select ${page.title}`}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
                          <span className="font-medium truncate max-w-[200px]">{page.title}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{page.slug}</code>
                      </td>
                      <td className="p-4 text-muted-foreground hidden md:table-cell">{page.campaigns?.name || "—"}</td>
                      <td className="p-4">
                        <Badge variant="secondary" className={statusColors[page.status]}>{page.status}</Badge>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 cursor-default">
                                <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      seoResult.score >= 85 ? "bg-emerald-500" :
                                      seoResult.score >= 60 ? "bg-primary" :
                                      seoResult.score >= 35 ? "bg-amber-500" : "bg-destructive"
                                    }`}
                                    style={{ width: `${seoResult.score}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-semibold tabular-nums ${seoResult.color}`}>
                                  {seoResult.score}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[220px] p-3">
                              <p className="text-xs font-semibold mb-1.5">SEO Score: {seoResult.score}/100 ({seoResult.label})</p>
                              <div className="space-y-1">
                                {seoResult.checks.map((c, i) => (
                                  <div key={i} className="flex items-start gap-1.5 text-[10px]">
                                    <span className={c.passed ? "text-emerald-500" : "text-destructive"}>{c.passed ? "✓" : "✗"}</span>
                                    <span className={c.passed ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                          <Button size="sm" variant="ghost" onClick={() => openSeoEditor(page)} title="Edit SEO">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCaptionPage(page)} title="AI Caption">
                            <MessageSquareText className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setPreviewPage(page)} title="Preview">
                            <Eye className="h-3 w-3" />
                          </Button>
                          {page.external_url && (
                            <>
                              <Button size="sm" variant="ghost" asChild title="Open live page">
                                <a href={page.external_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                              <SocialShareButtons
                                url={page.external_url}
                                title={(page as any).seo_title || page.title}
                                description={(page as any).seo_description || undefined}
                              />
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
            {previewPage?.external_url && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">Share:</span>
                <SocialShareButtons
                  url={previewPage.external_url}
                  title={(previewPage as any).seo_title || previewPage.title}
                  description={(previewPage as any).seo_description || undefined}
                />
              </div>
            )}
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
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => { setPreviewPage(null); setCaptionPage(previewPage); }}>
              <MessageSquareText className="h-3.5 w-3.5 mr-1.5" /> Generate Caption
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Social Caption Dialog */}
      <SocialCaptionDialog
        open={!!captionPage}
        onOpenChange={(open) => !open && setCaptionPage(null)}
        page={captionPage ? {
          title: captionPage.title,
          seo_title: (captionPage as any).seo_title,
          seo_description: (captionPage as any).seo_description,
          external_url: captionPage.external_url,
        } : null}
      />

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

      {/* Bulk SEO Edit Dialog */}
      <Dialog open={bulkSeoOpen} onOpenChange={setBulkSeoOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Bulk Edit SEO ({selectedIds.size} pages)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Set SEO metadata for all selected pages at once. Use template variables like <code className="font-mono bg-muted px-1 py-0.5 rounded text-primary">{"{title}"}</code> in fields — they won't be auto-replaced here but serve as a pattern reference.
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
        </DialogContent>
      </Dialog>

      {/* Bulk Caption Dialog */}
      <BulkCaptionDialog
        open={bulkCaptionOpen}
        onOpenChange={setBulkCaptionOpen}
        pages={pages.filter((p) => selectedIds.has(p.id)).map((p) => ({
          id: p.id,
          title: p.title,
          seo_title: (p as any).seo_title,
          seo_description: (p as any).seo_description,
          external_url: p.external_url,
        }))}
      />
    </div>
  );
}
