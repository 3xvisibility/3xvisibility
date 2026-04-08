import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AiEnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: { id: string; title: string; content: string } | null;
  onUpdated: () => void;
}

const ENRICH_MODES = [
  { value: "expand", label: "Expand & Add Detail", desc: "Add more paragraphs, examples, and depth" },
  { value: "seo_boost", label: "SEO Boost", desc: "Optimize headings, keywords, and structure for search" },
  { value: "add_faq", label: "Add FAQ Section", desc: "Generate and append a FAQ section" },
  { value: "improve_readability", label: "Improve Readability", desc: "Simplify language, shorten sentences, add formatting" },
  { value: "full_rewrite", label: "Full Rewrite", desc: "Completely rewrite while keeping the same topic" },
] as const;

type EnrichMode = typeof ENRICH_MODES[number]["value"];

const MODE_TO_ACTION: Record<EnrichMode, string> = {
  expand: "body",
  seo_boost: "headings",
  add_faq: "faq",
  improve_readability: "body",
  full_rewrite: "full_rewrite",
};

const MODE_INSTRUCTIONS: Record<EnrichMode, string> = {
  expand: "Expand and enrich this content with more detail, examples, statistics, and depth. Add 2-3 additional paragraphs. Keep all existing content.",
  seo_boost: "Optimize all headings for SEO. Add keyword-rich H2/H3 tags, improve heading hierarchy, and ensure proper semantic structure.",
  add_faq: "Generate a comprehensive FAQ section with 5-7 questions and answers relevant to this page's topic.",
  improve_readability: "Improve readability: shorten long sentences, use simpler words, add bullet points and formatting. Keep the meaning identical.",
  full_rewrite: "Fully rewrite this content to be fresher, more engaging, and better structured while keeping the same topic and key information.",
};

export function AiEnrichDialog({ open, onOpenChange, page, onUpdated }: AiEnrichDialogProps) {
  const [mode, setMode] = useState<EnrichMode>("expand");
  const [customInstruction, setCustomInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const handleEnrich = async () => {
    if (!page) return;
    setLoading(true);
    setDone(false);
    try {
      const action = MODE_TO_ACTION[mode];
      const instruction = customInstruction.trim()
        ? `${MODE_INSTRUCTIONS[mode]} Additional user instruction: ${customInstruction.trim()}`
        : MODE_INSTRUCTIONS[mode];

      if (action === "faq") {
        // FAQ appends to existing content
        const { data, error } = await supabase.functions.invoke("ai-seo-assistant", {
          body: { page_id: page.id, action: "faq", instruction },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        // Append FAQ to existing content
        const faqHtml = data.result;
        const { error: updateErr } = await supabase
          .from("generated_pages")
          .update({ content: page.content + "\n" + faqHtml })
          .eq("id", page.id);
        if (updateErr) throw updateErr;
      } else {
        // Use ai-seo-assistant for body/headings/full_rewrite — it returns improved HTML
        const { data, error } = await supabase.functions.invoke("ai-seo-assistant", {
          body: { page_id: page.id, action, instruction },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        // Update the page content
        const { error: updateErr } = await supabase
          .from("generated_pages")
          .update({ content: data.result })
          .eq("id", page.id);
        if (updateErr) throw updateErr;
      }

      setDone(true);
      onUpdated();
      toast({ title: "Content enriched", description: `${ENRICH_MODES.find(m => m.value === mode)?.label} applied successfully.` });
      setTimeout(() => {
        onOpenChange(false);
        setDone(false);
        setCustomInstruction("");
      }, 1200);
    } catch (err: any) {
      toast({ title: "Enrichment failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); setDone(false); setCustomInstruction(""); } }}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Content Enrichment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {page && (
            <p className="text-sm text-muted-foreground truncate">Page: <span className="font-medium text-foreground">{page.title}</span></p>
          )}
          <div className="space-y-2">
            <Label>Enrichment Type</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as EnrichMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENRICH_MODES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div>
                      <span className="font-medium">{m.label}</span>
                      <span className="ml-2 text-muted-foreground text-xs">— {m.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Custom Instructions <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              placeholder="e.g. Focus on local services, add pricing info, mention our brand name..."
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleEnrich} disabled={loading || done}>
              {done ? <><Check className="mr-1.5 h-3.5 w-3.5" />Done</> :
                loading ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Enriching...</> :
                <><Sparkles className="mr-1.5 h-3.5 w-3.5" />Enrich Content</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
