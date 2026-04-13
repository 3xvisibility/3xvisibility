import { useState } from "react";
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
  const [selectedFields, setSelectedFields] = useState<string[]>(["seo_title", "seo_description", "seo_keywords"]);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
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

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const runOptimize = async () => {
    if (selectedFields.length === 0) {
      toast({ title: "Select fields", description: "Pick at least one field to optimize", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

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
          instruction: instruction || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult({
        ...data.result,
        pushed_to_cms: data.pushed_to_cms,
        push_error: data.push_error || undefined,
        external_url: data.external_url,
      });

      toast({
        title: data.pushed_to_cms ? "SEO optimized & updated on site!" : "SEO optimized!",
        description: data.pushed_to_cms
          ? "Existing page updated — same URL, no new page created."
          : data.push_error || "Review the results below.",
        variant: data.push_error ? "destructive" : undefined,
      });

      onOptimized?.();
    } catch (err: any) {
      toast({ title: "Optimization failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
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
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setResult(null); setInstruction(""); } }}>
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
        <Button onClick={runOptimize} disabled={loading || selectedFields.length === 0} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Optimizing..." : "Optimize & Update on Site"}
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Results</p>
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

            {result.seo_title && (
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">SEO Title</span>
                  <Badge
                    variant={result.seo_title.length >= 30 && result.seo_title.length <= 60 ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {result.seo_title.length} chars
                  </Badge>
                </div>
                <p className="text-sm font-medium">{result.seo_title}</p>
              </div>
            )}

            {result.seo_description && (
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Meta Description</span>
                  <Badge
                    variant={result.seo_description.length >= 120 && result.seo_description.length <= 160 ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {result.seo_description.length} chars
                  </Badge>
                </div>
                <p className="text-sm">{result.seo_description}</p>
              </div>
            )}

            {result.seo_keywords && result.seo_keywords.length > 0 && (
              <div className="rounded-md border p-3">
                <span className="text-xs text-muted-foreground block mb-1.5">Keywords</span>
                <div className="flex flex-wrap gap-1.5">
                  {result.seo_keywords.map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.content && (
              <div className="rounded-md border p-3">
                <span className="text-xs text-muted-foreground block mb-1">Content Updated</span>
                <p className="text-xs text-muted-foreground">
                  Content text has been rewritten for SEO while preserving the page design.
                </p>
              </div>
            )}

            {result.external_url && (
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
