import { useState } from "react";
import { Sparkles, Copy, Check, Loader2, Wand2, Type, FileText, HelpCircle, Search, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Action = "titles" | "meta" | "headings" | "body" | "faq" | "keywords" | "full_rewrite";

interface AiSeoAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: Tables<"generated_pages"> | null;
  onUpdated?: () => void;
}

const ACTIONS: { value: Action; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "titles", label: "Titles", icon: <Type className="h-4 w-4" />, desc: "Generate 5 SEO-optimized title variations" },
  { value: "meta", label: "Meta", icon: <FileText className="h-4 w-4" />, desc: "Generate meta description variations" },
  { value: "headings", label: "Headings", icon: <Wand2 className="h-4 w-4" />, desc: "Rewrite headings for better SEO" },
  { value: "body", label: "Body", icon: <Wand2 className="h-4 w-4" />, desc: "Rewrite body content for engagement" },
  { value: "faq", label: "FAQ", icon: <HelpCircle className="h-4 w-4" />, desc: "Generate FAQ section from content" },
  { value: "keywords", label: "Keywords", icon: <Search className="h-4 w-4" />, desc: "Suggest relevant keywords" },
  { value: "full_rewrite", label: "Full Rewrite", icon: <RotateCw className="h-4 w-4" />, desc: "Complete content refresh" },
];

export function AiSeoAssistantDialog({ open, onOpenChange, page, onUpdated }: AiSeoAssistantDialogProps) {
  const [activeTab, setActiveTab] = useState<Action>("titles");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const runAction = async () => {
    if (!page) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-seo-assistant", {
        body: {
          page_id: page.id,
          action: activeTab,
          instruction: instruction || undefined,
          context: {
            keywords: page.seo_keywords || [],
            language: "en",
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.result);
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const applyResult = async () => {
    if (!page || !result) return;
    setLoading(true);
    try {
      const updates: Record<string, any> = {};

      if (activeTab === "titles") {
        try {
          const titles = JSON.parse(result);
          if (Array.isArray(titles) && titles.length > 0) {
            updates.title = titles[0];
            updates.seo_title = titles[0];
          }
        } catch {
          updates.title = result;
          updates.seo_title = result;
        }
      } else if (activeTab === "meta") {
        try {
          const parsed = JSON.parse(result);
          if (parsed.descriptions?.[0]) updates.seo_description = parsed.descriptions[0];
          if (parsed.suggested_title) updates.seo_title = parsed.suggested_title;
        } catch {
          updates.seo_description = result;
        }
      } else if (activeTab === "keywords") {
        try {
          const parsed = JSON.parse(result);
          const allKw = [
            ...(parsed.primary || []),
            ...(parsed.secondary || []),
          ].slice(0, 10);
          updates.seo_keywords = allKw;
        } catch {
          // ignore
        }
      } else if (activeTab === "faq") {
        updates.content = (page.content || "") + "\n" + result;
      } else {
        updates.content = result;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("generated_pages")
          .update(updates)
          .eq("id", page.id);
        if (error) throw error;
        toast({ title: "Applied", description: `AI ${activeTab} applied to page.` });
        onUpdated?.();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderResult = () => {
    if (!result) return null;

    if (activeTab === "titles") {
      try {
        const titles = JSON.parse(result);
        if (Array.isArray(titles)) {
          return (
            <div className="space-y-2">
              {titles.map((t: string, i: number) => (
                <div key={i} className="flex items-center gap-2 rounded-md border p-3">
                  <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                  <span className="flex-1 text-sm">{t}</span>
                  <Badge variant={t.length >= 20 && t.length <= 70 ? "default" : "destructive"} className="text-[10px]">
                    {t.length} chars
                  </Badge>
                </div>
              ))}
            </div>
          );
        }
      } catch {
        // fallthrough
      }
    }

    if (activeTab === "meta") {
      try {
        const parsed = JSON.parse(result);
        return (
          <div className="space-y-3">
            {parsed.suggested_title && (
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground mb-1">Suggested Title</p>
                <p className="text-sm font-medium">{parsed.suggested_title}</p>
              </div>
            )}
            {parsed.descriptions?.map((d: string, i: number) => (
              <div key={i} className="rounded-md border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Description {i + 1}</span>
                  <Badge variant={d.length >= 120 && d.length <= 160 ? "default" : "secondary"} className="text-[10px]">
                    {d.length} chars
                  </Badge>
                </div>
                <p className="text-sm">{d}</p>
              </div>
            ))}
          </div>
        );
      } catch {
        // fallthrough
      }
    }

    if (activeTab === "keywords") {
      try {
        const parsed = JSON.parse(result);
        return (
          <div className="space-y-3">
            {Object.entries(parsed).map(([category, kws]: [string, any]) => (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-1.5">{category.replace("_", " ")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(kws as string[]).map((kw: string) => (
                    <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      } catch {
        // fallthrough
      }
    }

    // HTML/text fallback
    return (
      <div className="rounded-md border bg-muted/30 p-3 max-h-64 overflow-y-auto">
        <pre className="text-xs whitespace-pre-wrap font-mono">{result.slice(0, 3000)}</pre>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setResult(null); setInstruction(""); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI SEO Assistant
          </DialogTitle>
          <DialogDescription>
            Generate or rewrite content for "{page?.title?.slice(0, 50)}"
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as Action); setResult(null); }}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {ACTIONS.map((a) => (
              <TabsTrigger key={a.value} value={a.value} className="gap-1.5 text-xs">
                {a.icon} {a.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {ACTIONS.map((a) => (
            <TabsContent key={a.value} value={a.value} className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">{a.desc}</p>

              <Textarea
                placeholder="Optional: Add specific instructions (e.g., 'Focus on local plumbing services in Austin')..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="h-20"
              />

              <Button onClick={runAction} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate
              </Button>

              {result && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Results</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={copyToClipboard} className="gap-1.5">
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      <Button size="sm" onClick={applyResult} disabled={loading} className="gap-1.5">
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Apply to Page
                      </Button>
                    </div>
                  </div>
                  {renderResult()}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
