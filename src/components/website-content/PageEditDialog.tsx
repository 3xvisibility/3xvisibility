import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pencil,
  Loader2,
  Check,
  Eye,
  Code,
  ArrowUpRight,
  AlertTriangle,
  Diff,
  Sparkles,
  Search,
  FileText,
  Type,
  RefreshCw,
} from "lucide-react";
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
}

interface PageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: ContentItem;
  websiteId: string;
  websiteType: string;
  workspaceId?: string;
  onUpdated?: () => void;
}

function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== "string") return text;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function computeChanges(original: string, updated: string) {
  const oldLines = original.split("\n");
  const newLines = updated.split("\n");
  const changes: { type: "added" | "removed" | "same"; text: string }[] = [];
  const max = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < max; i++) {
    const o = oldLines[i] ?? "";
    const n = newLines[i] ?? "";
    if (o === n) {
      changes.push({ type: "same", text: n });
    } else {
      if (o) changes.push({ type: "removed", text: o });
      if (n) changes.push({ type: "added", text: n });
    }
  }
  return changes;
}

const SEO_FIELDS = [
  { id: "seo_title", label: "SEO Title", icon: <Type className="h-3.5 w-3.5" />, desc: "Optimized title (30-60 chars)" },
  { id: "seo_description", label: "Meta Description", icon: <FileText className="h-3.5 w-3.5" />, desc: "Meta description (120-160 chars)" },
  { id: "seo_keywords", label: "Keywords", icon: <Search className="h-3.5 w-3.5" />, desc: "5-8 relevant SEO keywords" },
  { id: "content", label: "Content Text", icon: <RefreshCw className="h-3.5 w-3.5" />, desc: "Rewrite text for SEO (keeps design)" },
];

export function PageEditDialog({
  open,
  onOpenChange,
  page,
  websiteId,
  websiteType,
  workspaceId,
  onUpdated,
}: PageEditDialogProps) {
  const { toast } = useToast();
  const [editTitle, setEditTitle] = useState(decodeHtmlEntities(page.title));
  const [editContent, setEditContent] = useState(page.content);
  const [editExcerpt, setEditExcerpt] = useState(page.excerpt || "");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("edit");

  // SEO optimize state
  const [seoFields, setSeoFields] = useState<string[]>(["seo_title", "seo_description", "seo_keywords"]);
  const [seoInstruction, setSeoInstruction] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [seoResult, setSeoResult] = useState<{
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
  } | null>(null);

  const originalTitle = decodeHtmlEntities(page.title);
  const originalContent = page.content;

  const hasChanges = useMemo(
    () => editTitle !== originalTitle || editContent !== originalContent || editExcerpt !== (page.excerpt || ""),
    [editTitle, editContent, editExcerpt, originalTitle, originalContent, page.excerpt]
  );

  const contentChanges = useMemo(
    () => computeChanges(originalContent, editContent),
    [originalContent, editContent]
  );

  const changedLineCount = useMemo(
    () => contentChanges.filter((c) => c.type !== "same").length,
    [contentChanges]
  );

  const toggleSeoField = (field: string) => {
    setSeoFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  // Run AI SEO optimization → populate editor fields
  const runOptimize = async () => {
    if (seoFields.length === 0) {
      toast({ title: "Select fields", description: "Pick at least one field to optimize", variant: "destructive" });
      return;
    }
    setOptimizing(true);
    setSeoResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("optimize-seo-content", {
        body: {
          website_id: websiteId,
          page_external_id: page.id,
          page_title: editTitle,
          page_content: editContent,
          page_slug: page.slug,
          page_url: page.url,
          page_type: page.type,
          workspace_id: workspaceId,
          optimize_fields: seoFields,
          instruction: seoInstruction || undefined,
          skip_push: true, // Don't push yet — let user review first
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result = data.result || {};

      // Apply AI results to the editor fields
      if (result.seo_title && seoFields.includes("seo_title")) {
        setEditTitle(result.seo_title);
      }
      if (result.seo_description && seoFields.includes("seo_description")) {
        setEditExcerpt(result.seo_description);
      }
      if (result.content && seoFields.includes("content")) {
        setEditContent(result.content);
      }

      setSeoResult({
        seo_title: result.seo_title,
        seo_description: result.seo_description,
        seo_keywords: result.seo_keywords,
      });

      toast({
        title: "SEO content generated!",
        description: "Review the changes in the Edit tab, then republish.",
      });

      // Switch to Changes tab to show diff
      setActiveTab("changes");
    } catch (err: any) {
      toast({ title: "Optimization failed", description: err.message, variant: "destructive" });
    } finally {
      setOptimizing(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPushError(null);
    setPublished(false);

    try {
      const { data, error } = await supabase.functions.invoke("optimize-seo-content", {
        body: {
          website_id: websiteId,
          page_external_id: page.id,
          page_title: editTitle,
          page_content: editContent,
          page_slug: page.slug,
          page_url: page.url,
          page_type: page.type,
          workspace_id: workspaceId,
          optimize_fields: [],
          manual_update: true,
          manual_title: editTitle,
          manual_content: editContent,
          manual_excerpt: editExcerpt,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.pushed_to_cms) {
        setPublished(true);
        toast({ title: "Page updated on site!", description: "Same URL — no new page created." });
        onUpdated?.();
      } else {
        setPushError(data?.push_error || "Failed to update on CMS");
        toast({ title: "Update failed", description: data?.push_error || "Could not push to website", variant: "destructive" });
      }
    } catch (err: any) {
      setPushError(err.message);
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setPublished(false); setPushError(null); setSeoResult(null); } }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit & Optimize SEO
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 truncate">
            <span>/{page.slug}</span>
            <ScoresBadgeGroup title={editTitle} content={editContent} slug={page.slug} url={page.url} size="sm" showLabels />
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0">
            <TabsTrigger value="edit" className="text-xs gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </TabsTrigger>
            <TabsTrigger value="seo" className="text-xs gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Optimize SEO
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Preview
            </TabsTrigger>
            <TabsTrigger value="changes" className="text-xs gap-1.5">
              <Diff className="h-3.5 w-3.5" /> Changes
              {changedLineCount > 0 && (
                <Badge variant="secondary" className="text-[10px] ml-1 h-4 px-1">
                  {changedLineCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="source" className="text-xs gap-1.5">
              <Code className="h-3.5 w-3.5" /> HTML
            </TabsTrigger>
          </TabsList>

          {/* ── Edit Tab ── */}
          <TabsContent value="edit" className="flex-1 min-h-0 mt-3 space-y-3 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm" />
              {editTitle !== originalTitle && (
                <p className="text-[10px] text-primary">Changed from: "{originalTitle}"</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Excerpt / Meta Description</Label>
              <Textarea
                value={editExcerpt}
                onChange={(e) => setEditExcerpt(e.target.value)}
                className="h-16 text-sm"
                placeholder="Page excerpt or meta description..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Content (HTML)</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[300px] text-xs font-mono"
              />
            </div>
          </TabsContent>

          {/* ── SEO Optimize Tab ── */}
          <TabsContent value="seo" className="flex-1 min-h-0 mt-3 overflow-y-auto">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">What to optimize with AI:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SEO_FIELDS.map((f) => (
                    <label
                      key={f.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        seoFields.includes(f.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <Checkbox
                        checked={seoFields.includes(f.id)}
                        onCheckedChange={() => toggleSeoField(f.id)}
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

              <Textarea
                placeholder="Optional instructions (e.g., 'Focus on plumbing services in Paris')..."
                value={seoInstruction}
                onChange={(e) => setSeoInstruction(e.target.value)}
                className="h-16 text-sm"
              />

              <Button onClick={runOptimize} disabled={optimizing || seoFields.length === 0} className="gap-2 w-full">
                {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {optimizing ? "Generating SEO content..." : "Generate Optimized Content"}
              </Button>

              {/* SEO Results summary */}
              {seoResult && (
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium">AI content applied to editor</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Review changes in the Edit or Changes tab, then click "Republish to Site" to update your page.
                  </p>

                  {seoResult.seo_title && (
                    <div className="rounded-md border p-2.5">
                      <span className="text-[10px] text-muted-foreground">New Title</span>
                      <p className="text-sm font-medium">{seoResult.seo_title}</p>
                    </div>
                  )}
                  {seoResult.seo_description && (
                    <div className="rounded-md border p-2.5">
                      <span className="text-[10px] text-muted-foreground">New Meta Description</span>
                      <p className="text-sm">{seoResult.seo_description}</p>
                    </div>
                  )}
                  {seoResult.seo_keywords && seoResult.seo_keywords.length > 0 && (
                    <div className="rounded-md border p-2.5">
                      <span className="text-[10px] text-muted-foreground block mb-1">Keywords</span>
                      <div className="flex flex-wrap gap-1">
                        {seoResult.seo_keywords.map((kw) => (
                          <Badge key={kw} variant="outline" className="text-[10px]">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Preview Tab ── */}
          <TabsContent value="preview" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[450px]">
              <div className="rounded-lg border p-4">
                <h1 className="text-lg font-bold mb-2">{editTitle}</h1>
                {editExcerpt && (
                  <p className="text-sm text-muted-foreground mb-3 italic">{editExcerpt}</p>
                )}
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: editContent }}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Changes Tab ── */}
          <TabsContent value="changes" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[450px]">
              {!hasChanges ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No changes yet — edit manually or use Optimize SEO
                </div>
              ) : (
                <div className="space-y-2">
                  {editTitle !== originalTitle && (
                    <div className="rounded-md border p-3 space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Title</span>
                      <p className="text-sm line-through text-destructive/70">{originalTitle}</p>
                      <p className="text-sm text-primary">{editTitle}</p>
                    </div>
                  )}
                  {editExcerpt !== (page.excerpt || "") && (
                    <div className="rounded-md border p-3 space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Excerpt</span>
                      <p className="text-sm line-through text-destructive/70">{page.excerpt || "(empty)"}</p>
                      <p className="text-sm text-primary">{editExcerpt || "(empty)"}</p>
                    </div>
                  )}
                  {editContent !== originalContent && (
                    <div className="rounded-md border p-3">
                      <span className="text-xs font-medium text-muted-foreground mb-2 block">
                        Content ({changedLineCount} lines changed)
                      </span>
                      <div className="font-mono text-[11px] space-y-0.5 max-h-[350px] overflow-y-auto">
                        {contentChanges.map((line, i) => {
                          if (line.type === "same") return null;
                          return (
                            <div
                              key={i}
                              className={`px-2 py-0.5 rounded-sm ${
                                line.type === "added"
                                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                                  : "bg-destructive/10 text-destructive line-through border-l-2 border-destructive"
                              }`}
                            >
                              <span className="mr-2 opacity-50">{line.type === "added" ? "+" : "−"}</span>
                              {line.text.slice(0, 200)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* ── HTML Source Tab ── */}
          <TabsContent value="source" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[450px]">
              <pre className="text-[11px] font-mono bg-muted/30 rounded-lg p-4 whitespace-pre-wrap break-all">
                {editContent}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {published && (
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                <Check className="h-3 w-3 mr-1" /> Updated on site
              </Badge>
            )}
            {pushError && (
              <Badge variant="destructive" className="text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-1" /> {pushError.slice(0, 60)}
              </Badge>
            )}
            {hasChanges && !published && (
              <span className="text-xs text-muted-foreground">{changedLineCount} lines changed</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {page.url && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => window.open(page.url, "_blank")}>
                <ArrowUpRight className="h-3.5 w-3.5" /> View Page
              </Button>
            )}
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!hasChanges || publishing}
              className="gap-1.5 text-xs h-8"
            >
              {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {publishing ? "Publishing..." : "Republish to Site"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
