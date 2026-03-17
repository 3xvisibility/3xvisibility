import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Copy, Check, Download, Facebook, Linkedin, Twitter, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PageInput {
  id: string;
  title: string;
  seo_title?: string | null;
  seo_description?: string | null;
  external_url?: string | null;
}

interface CaptionResult {
  id: string;
  title: string;
  caption: string;
  error?: string;
}

interface BulkCaptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: PageInput[];
}

const toneOptions = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "marketing", label: "Marketing" },
];

const lengthOptions = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

export default function BulkCaptionDialog({ open, onOpenChange, pages }: BulkCaptionDialogProps) {
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CaptionResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true);
    setProgress(10);
    setResults([]);
    try {
      const payload = pages.map((p) => ({
        id: p.id,
        title: p.seo_title || p.title,
        description: p.seo_description || "",
        url: p.external_url || "",
      }));

      setProgress(30);

      const { data, error } = await supabase.functions.invoke("generate-caption", {
        body: { pages: payload, tone, length },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(data.results || []);
      setProgress(100);
      toast({ title: `${(data.results || []).length} captions generated` });
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copySingle = async (id: string, caption: string) => {
    await navigator.clipboard.writeText(caption);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Caption copied!" });
  };

  const copyAll = async () => {
    const text = results
      .filter((r) => r.caption)
      .map((r) => `${r.title}\n${r.caption}`)
      .join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast({ title: "All captions copied!" });
  };

  const downloadCsv = () => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const header = "Title,Caption,URL";
    const rows = results.map((r) => {
      const page = pages.find((p) => p.id === r.id);
      return [escape(r.title), escape(r.caption), escape(page?.external_url || "")].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "social-captions.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV downloaded" });
  };

  const openShare = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "width=600,height=400,noopener,noreferrer");
  };

  const updateCaption = (id: string, newCaption: string) => {
    setResults((prev) => prev.map((r) => (r.id === id ? { ...r, caption: newCaption } : r)));
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setResults([]);
      setProgress(0);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Bulk Caption Generator
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Generate social media captions for {pages.length} selected page{pages.length !== 1 ? "s" : ""}
          </p>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Settings + Generate */}
          <div className="flex items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">Length</Label>
              <Select value={length} onValueChange={setLength}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lengthOptions.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={generate}
              disabled={loading}
              size="sm"
              className="bg-gradient-primary border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 transition-all duration-200"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              {loading ? "Generating..." : results.length > 0 ? "Regenerate" : "Generate All"}
            </Button>
          </div>

          {loading && (
            <div>
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Generating captions...</p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <>
              {/* Bulk actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyAll}>
                  {copiedAll ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                  {copiedAll ? "Copied" : "Copy All"}
                </Button>
                <Button size="sm" variant="outline" onClick={downloadCsv}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download CSV
                </Button>
              </div>

              {/* Caption list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {results.map((r) => {
                  const page = pages.find((p) => p.id === r.id);
                  return (
                    <div key={r.id} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold truncate">{r.title}</h4>
                        {r.error && (
                          <Badge variant="destructive" className="text-[10px] shrink-0">Error</Badge>
                        )}
                      </div>

                      {r.caption ? (
                        <>
                          <Textarea
                            value={r.caption}
                            onChange={(e) => updateCaption(r.id, e.target.value)}
                            rows={2}
                            className="text-xs resize-none"
                          />
                          <div className="flex items-center justify-between">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => copySingle(r.id, r.caption)}
                            >
                              {copiedId === r.id ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                              {copiedId === r.id ? "Copied" : "Copy"}
                            </Button>
                            {page?.external_url && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(page.external_url!)}`)}
                                  title="Share on Facebook"
                                >
                                  <Facebook className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(page.external_url!)}`)}
                                  title="Share on LinkedIn"
                                >
                                  <Linkedin className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(r.caption)}&url=${encodeURIComponent(page.external_url!)}`)}
                                  title="Share on X"
                                >
                                  <Twitter className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-destructive">{r.error || "No caption generated"}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
