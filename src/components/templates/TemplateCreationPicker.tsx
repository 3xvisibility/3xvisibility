import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Paintbrush, Sparkles, Globe, MonitorSmartphone,
  ArrowRight, CheckCircle2, Target, Search, Plus, X, Loader2,
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

const SUGGESTED_KEYWORDS = [
  "city", "state", "country", "service", "product", "category",
  "brand_name", "price", "phone", "address", "zip_code", "neighborhood",
];

export function TemplateCreationPicker({ open, onOpenChange, onSelect }: TemplateCreationPickerProps) {
  const [selected, setSelected] = useState<CreationMethod | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");

  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  // Existing keywords (optional — shown if available)
  const { data: existingKeywords = [] } = useQuery({
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

  const addCustomKeyword = () => {
    const kw = customKeyword.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_|_$/g, "");
    if (kw && !selectedKeywords.includes(kw)) {
      setSelectedKeywords(prev => [...prev, kw]);
    }
    setCustomKeyword("");
  };

  const removeKeyword = (name: string) => {
    setSelectedKeywords(prev => prev.filter(k => k !== name));
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
    setCustomKeyword("");
    setTargetUrl("");
    setSelectedWebsiteId("");
  };

  const canContinue = () => {
    if (!selected) return false;
    if (selected === "url" && !targetUrl.trim()) return false;
    if (selected === "website" && !selectedWebsiteId) return false;
    return true;
  };

  // Merge suggested + existing into one pool, avoid duplicates with selected
  const availableSuggestions = SUGGESTED_KEYWORDS.filter(k => !selectedKeywords.includes(k));
  const availableExisting = existingKeywords.filter(kw => !selectedKeywords.includes(kw.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <h2 className="text-lg font-bold">Create Template</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose your creation method and add keywords that match your business needs.
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

          {/* Step 2: Keywords — Smart Input */}
          {selected && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                <span className="text-sm font-semibold">Add Keywords (Variables)</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Keywords become dynamic variables in your template. AI will suggest the best ones based on your business — or add your own.
              </p>

              {/* Custom keyword input */}
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Type a keyword e.g. service, neighborhood..."
                  value={customKeyword}
                  onChange={e => setCustomKeyword(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomKeyword(); } }}
                  className="flex-1 h-9"
                />
                <Button size="sm" variant="outline" onClick={addCustomKeyword} disabled={!customKeyword.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Selected keywords */}
              {selectedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedKeywords.map(kw => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground"
                    >
                      {`{${kw}}`}
                      <button onClick={() => removeKeyword(kw)} className="hover:opacity-70">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested keywords */}
              {availableSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Suggested</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSuggestions.map(kw => (
                      <button
                        key={kw}
                        onClick={() => toggleKeyword(kw)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing PGP keywords */}
              {availableExisting.length > 0 && (
                <div className="space-y-1.5 mt-3">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">From your keyword groups</span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableExisting.map(kw => (
                      <button
                        key={kw.id}
                        onClick={() => toggleKeyword(kw.name)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-background hover:border-primary/50 transition-colors"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        {`{${kw.name}}`}
                        <span className="text-[10px] opacity-60">{kw.term_count} terms</span>
                      </button>
                    ))}
                  </div>
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
