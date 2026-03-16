import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Eye, Trash2, ExternalLink, FileText, Send, Pencil, Tag, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type GeneratedPage = Tables<"generated_pages"> & {
  campaigns?: { name: string } | null;
  websites?: { name: string } | null;
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  published: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
};

export default function GeneratedPagesPage() {
  const [search, setSearch] = useState("");
  const [previewPage, setPreviewPage] = useState<GeneratedPage | null>(null);
  const [seoEditPage, setSeoEditPage] = useState<GeneratedPage | null>(null);
  const [seoForm, setSeoForm] = useState({ seo_title: "", seo_description: "", seo_keywords: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["generated-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("*, campaigns(name), websites(name)")
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

  const publishMutation = useMutation({
    mutationFn: async (pageIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: { page_ids: pageIds },
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
      const keywordsArr = seo_keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
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

  const openSeoEditor = (page: GeneratedPage) => {
    setSeoEditPage(page);
    setSeoForm({
      seo_title: (page as any).seo_title || "",
      seo_description: (page as any).seo_description || "",
      seo_keywords: ((page as any).seo_keywords || []).join(", "),
    });
  };

  const pendingPages = pages.filter((p) => p.status === "pending");

  const filtered = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      (p.campaigns?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display">Generated Pages</h1>
          <p className="text-muted-foreground mt-1">Browse and manage all pages created by your campaigns.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {pendingPages.length > 0 && (
            <Button
              size="sm"
              className="bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 transition-all duration-200"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate(pendingPages.map((p) => p.id))}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {publishMutation.isPending ? "Publishing..." : `Publish All (${pendingPages.length})`}
            </Button>
          )}
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
                  <th className="text-left p-4 font-medium text-muted-foreground">Title</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden sm:table-cell">Slug</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden md:table-cell">Campaign</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground hidden lg:table-cell">SEO</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((page) => {
                  const hasSeo = !!(page as any).seo_title || !!(page as any).seo_description;
                  return (
                    <tr key={page.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors duration-150">
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
                        {hasSeo ? (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                            <Tag className="h-2.5 w-2.5 mr-1" /> SEO
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {page.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary"
                              onClick={() => publishMutation.mutate([page.id])}
                              disabled={publishMutation.isPending}
                              title="Publish"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => openSeoEditor(page)} title="Edit SEO">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setPreviewPage(page)} title="Preview">
                            <Eye className="h-3 w-3" />
                          </Button>
                          {page.external_url && (
                            <Button size="sm" variant="ghost" asChild title="Open live page">
                              <a href={page.external_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
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

          {/* SEO Preview */}
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

      {/* SEO Edit Dialog */}
      <Dialog open={!!seoEditPage} onOpenChange={(open) => !open && setSeoEditPage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              Edit SEO Metadata
            </DialogTitle>
          </DialogHeader>
          {seoEditPage && (
            <div className="space-y-4 mt-2">
              <p className="text-xs text-muted-foreground">
                Page: <span className="font-medium text-foreground">{seoEditPage.title}</span>
              </p>

              {/* Google SERP Preview */}
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
                  onClick={() =>
                    seoSaveMutation.mutate({
                      id: seoEditPage.id,
                      ...seoForm,
                    })
                  }
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
