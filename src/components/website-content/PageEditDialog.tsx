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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  onUpdated?: () => void;
}

function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== "string") return text;
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

/** Simple diff: find lines that changed between old and new */
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

export function PageEditDialog({
  open,
  onOpenChange,
  page,
  websiteId,
  websiteType,
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
          workspace_id: undefined,
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
        toast({
          title: "Page updated on site!",
          description: "Same URL — no new page created.",
        });
        onUpdated?.();
      } else {
        setPushError(data?.push_error || "Failed to update on CMS");
        toast({
          title: "Update failed",
          description: data?.push_error || "Could not push to website",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      setPushError(err.message);
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setPublished(false); setPushError(null); } }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Page
          </DialogTitle>
          <DialogDescription className="truncate">
            Edit content and republish to the same URL — /{page.slug}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0">
            <TabsTrigger value="edit" className="text-xs gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
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

          <TabsContent value="edit" className="flex-1 min-h-0 mt-3 space-y-3 overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-sm"
              />
              {editTitle !== originalTitle && (
                <p className="text-[10px] text-primary">
                  Changed from: "{originalTitle}"
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Excerpt / Description</Label>
              <Textarea
                value={editExcerpt}
                onChange={(e) => setEditExcerpt(e.target.value)}
                className="h-16 text-sm"
                placeholder="Page excerpt or short description..."
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

          <TabsContent value="changes" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[450px]">
              {!hasChanges ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  No changes yet — edit the page to see a diff
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
                </div>
              )}
            </ScrollArea>
          </TabsContent>

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
          <div className="flex items-center gap-2">
            {published && (
              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
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
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8"
                onClick={() => window.open(page.url, "_blank")}
              >
                <ArrowUpRight className="h-3.5 w-3.5" /> View Page
              </Button>
            )}
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!hasChanges || publishing}
              className="gap-1.5 text-xs h-8"
            >
              {publishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {publishing ? "Publishing..." : "Republish to Site"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
