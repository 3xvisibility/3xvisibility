import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Paintbrush, Sparkles, Globe, MonitorSmartphone,
  ArrowRight, CheckCircle2, Target, Search,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Tables } from "@/integrations/supabase/types";

type Website = Tables<"websites">;

export type CreationMethod = "design" | "ai" | "url" | "website";

interface TemplateCreationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (method: CreationMethod, config: {
    selectedKeywords: string[];
    targetUrl?: string;
    selectedWebsite?: Website;
  }) => void;
}

const METHODS = [
  {
    id: "design" as const,
    icon: Paintbrush,
    title: "Design Your Own",
    desc: "Build a custom template from scratch using the HTML editor with full creative control.",
    color: "bg-primary/10 text-primary",
  },
  {
    id: "ai" as const,
    icon: Sparkles,
    title: "Generate with AI",
    desc: "Describe your business and let AI create a high-scoring template optimized for SEO, SEA & GEO.",
    color: "bg-violet-500/10 text-violet-600",
  },
  {
    id: "url" as const,
    icon: Globe,
    title: "Import from URL",
    desc: "Scan any public webpage to extract its design and convert it into a reusable template.",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    id: "website" as const,
    icon: MonitorSmartphone,
    title: "From Connected Site",
    desc: "Import an existing page from your connected WordPress, Shopify, or PrestaShop site.",
    color: "bg-amber-500/10 text-amber-600",
  },
];

export function TemplateCreationPicker({ open, onOpenChange, onSelect }: TemplateCreationPickerProps) {
  const [selected, setSelected] = useState<CreationMethod | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");

  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: keywords = [] } = useQuery({
    queryKey: ["pgp-keywords-picker", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgp_keywords")
        .select("id, name, term_count")
        .eq("workspace_id", wsId!);
      if (error) throw error;
      return data;
    },
  });

  const { data: websites = [] } = useQuery({
    queryKey: ["websites-picker", wsId],
    enabled: !!wsId && selected === "website",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .eq("workspace_id", wsId!);
      if (error) throw error;
      return data as Website[];
    },
  });

  const toggleKeyword = (name: string) => {
    setSelectedKeywords(prev =>
      prev.includes(name) ? prev.filter(k => k !== name) : [...prev, name]
    );
  };

  const handleContinue = () => {
    if (!selected) return;
    const website = websites.find(w => w.id === selectedWebsiteId);
    onSelect(selected, {
      selectedKeywords,
      targetUrl: selected === "url" ? targetUrl : undefined,
      selectedWebsite: selected === "website" ? website : undefined,
    });
    // Reset
    setSelected(null);
    setSelectedKeywords([]);
    setTargetUrl("");
    setSelectedWebsiteId("");
  };

  const canContinue = () => {
    if (!selected) return false;
    if (selected === "url" && !targetUrl.trim()) return false;
    if (selected === "website" && !selectedWebsiteId) return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <h2 className="text-lg font-bold">Create Content Group</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how you want to create your template, then select keywords for variable mapping.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Method */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
              <span className="text-sm font-semibold">Choose Creation Method</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    selected === m.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {selected === m.id && (
                    <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-primary" />
                  )}
                  <div className={`h-10 w-10 rounded-lg ${m.color} flex items-center justify-center mb-3`}>
                    <m.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-sm">{m.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional: URL input */}
          {selected === "url" && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <Label className="text-xs font-semibold">Page URL to scan</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/page"
                  value={targetUrl}
                  onChange={e => setTargetUrl(e.target.value)}
                  className="flex-1"
                />
                <Search className="h-4 w-4 text-muted-foreground mt-3" />
              </div>
            </div>
          )}

          {/* Conditional: Website select */}
          {selected === "website" && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <Label className="text-xs font-semibold">Select connected website</Label>
              {websites.length === 0 ? (
                <p className="text-xs text-muted-foreground">No websites connected yet. Connect a site first.</p>
              ) : (
                <Select value={selectedWebsiteId} onValueChange={setSelectedWebsiteId}>
                  <SelectTrigger><SelectValue placeholder="Choose a website..." /></SelectTrigger>
                  <SelectContent>
                    {websites.map(w => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} — {w.url}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Step 2: Keywords */}
          {selected && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                <span className="text-sm font-semibold">Select Keywords (Variables)</span>
              </div>
              {keywords.length === 0 ? (
                <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
                  ⚠️ No keywords created yet. You can still create a template and add keywords later.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {keywords.map(kw => (
                    <button
                      key={kw.id}
                      onClick={() => toggleKeyword(kw.name)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selectedKeywords.includes(kw.name)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      {selectedKeywords.includes(kw.name) && <CheckCircle2 className="h-3 w-3" />}
                      {`{${kw.name}}`}
                      <span className="text-[10px] opacity-70">{kw.term_count} terms</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Score Target */}
          {selected && (
            <div className="rounded-xl border bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold">Quality Target: 90+ Score</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All templates will be optimized to achieve <strong>90%+ scores</strong> across SEO, SEA, and GEO metrics. 
                {selected === "ai" && " AI will automatically generate content that meets this threshold."}
                {selected === "design" && " The editor will show live scoring and suggestions to help you reach this target."}
                {selected === "url" && " After scanning, AI will suggest improvements to boost scores above 90%."}
                {selected === "website" && " Imported content will be analyzed and AI will suggest optimizations."}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">SEO 90+</Badge>
                <Badge variant="outline" className="text-blue-600 border-blue-300 text-[10px]">SEA 90+</Badge>
                <Badge variant="outline" className="text-purple-600 border-purple-300 text-[10px]">GEO 90+</Badge>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            disabled={!canContinue()}
            onClick={handleContinue}
          >
            Continue <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
