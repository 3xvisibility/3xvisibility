import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Paintbrush, Sparkles, Globe, MonitorSmartphone,
  ArrowRight, CheckCircle2, Target, Plus, X, Loader2,
  FileText, ShoppingBag, Briefcase, FolderOpen, Folder, Layers, Lock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import type { FeatureKey } from "@/lib/plan-features";
import type { Tables } from "@/integrations/supabase/types";

type Website = Tables<"websites">;

export type CreationMethod = "design" | "ai" | "url" | "website";
export type ContentType = "pages" | "products" | "services";
export type TargetPlatform = "wordpress" | "shopify" | "prestashop" | "generic";

interface TemplateCreationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (method: CreationMethod, config: {
    selectedKeywords: string[];
    targetUrl?: string;
    selectedWebsite?: Website;
    contentType?: ContentType;
    platform?: TargetPlatform;
  }) => void;
}

const METHODS = [
  {
    id: "design" as const,
    icon: Paintbrush,
    title: "Design Your Own",
    desc: "HTML editor with live preview & drag-and-drop blocks.",
    color: "bg-primary/10 text-primary",
  },
  {
    id: "ai" as const,
    icon: Sparkles,
    title: "Generate with AI",
    desc: "AI creates a professional template optimized for SEO.",
    color: "bg-violet-500/10 text-violet-600",
  },
  {
    id: "url" as const,
    icon: Globe,
    title: "Import from URL",
    desc: "Scan any page and convert it into a reusable template.",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    id: "website" as const,
    icon: MonitorSmartphone,
    title: "From Connected Site",
    desc: "Import pages or products from your connected CMS.",
    color: "bg-amber-500/10 text-amber-600",
  },
];

const CONTENT_TYPES: { id: ContentType; icon: typeof FileText; label: string; desc: string }[] = [
  { id: "pages", icon: FileText, label: "Pages", desc: "Landing pages, about, contact" },
  { id: "products", icon: ShoppingBag, label: "Products", desc: "Product listings & catalogs" },
  { id: "services", icon: Briefcase, label: "Services", desc: "Service offerings & descriptions" },
];

const PLATFORMS: { id: TargetPlatform; icon: string; label: string; desc: string; feature: FeatureKey; comingSoon?: boolean }[] = [
  { id: "wordpress", icon: "🟦", label: "WordPress / Elementor", desc: "Editable in Elementor page builder", feature: "wordpress" },
  { id: "shopify", icon: "🛍️", label: "Shopify", desc: "Liquid-friendly, OS 2.0 sections", feature: "shopify" },
  { id: "prestashop", icon: "🛒", label: "PrestaShop", desc: "Smarty + Bootstrap grid", feature: "prestashop", comingSoon: true },
  { id: "generic", icon: "🌐", label: "Universal HTML", desc: "Works on any platform", feature: "shopify" },
];

const FALLBACK_KEYWORDS = [
  "city", "state", "service", "product", "brand_name",
  "price", "phone", "address", "category", "neighborhood",
];

export function TemplateCreationPicker({ open, onOpenChange, onSelect }: TemplateCreationPickerProps) {
  const [selected, setSelected] = useState<CreationMethod | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");
  const [contentType, setContentType] = useState<ContentType>("pages");
  const [platform, setPlatform] = useState<TargetPlatform>("wordpress");
  const [folderFilter, setFolderFilter] = useState<string>("__all__");

  const { features } = useSubscription();
  // PrestaShop is always locked (Coming Soon). Others gated by plan feature flags.
  const isPlatformLocked = (p: typeof PLATFORMS[number]) => p.comingSoon || !features[p.feature];

  // AI keyword suggestion
  const [businessNiche, setBusinessNiche] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const wsId = currentWorkspace?.id;

  const { data: existingKeywords = [] } = useQuery({
    queryKey: ["pgp-keywords-picker", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgp_keywords")
        .select("id, name, term_count, folder")
        .eq("workspace_id", wsId!);
      if (error) throw error;
      return data as { id: string; name: string; term_count: number; folder: string | null }[];
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

  const suggestKeywords = async () => {
    if (!businessNiche.trim()) return;
    setAiSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: {
          prompt: `You are a SEO expert. Given the business niche "${businessNiche}", suggest 8-12 dynamic template variables that would be most useful for generating pages at scale.

Rules:
- Return ONLY a comma-separated list of lowercase_snake_case variable names
- Focus on variables specific to this business type (e.g. for plumber: service_type, emergency_service, license_number)
- Always include: city, state, brand_name
- Add industry-specific variables that would make content unique
- No explanations, no numbering, just comma-separated names

Example for "dentist": city, state, brand_name, dental_service, insurance_accepted, office_hours, dentist_name, procedure_name, patient_testimonial, emergency_dental`
        },
      });
      if (error) throw error;
      const raw = (data?.content || "").replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      const suggestions = raw.split(",").map((s: string) => s.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_|_$/g, "")).filter(Boolean);
      setAiSuggestions(suggestions);
      toast({ title: `${suggestions.length} keywords suggested!` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
      setAiSuggestions(FALLBACK_KEYWORDS);
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleContinue = () => {
    if (!selected) return;
    const website = websites.find(w => w.id === selectedWebsiteId);
    onSelect(selected, {
      selectedKeywords,
      targetUrl: selected === "url" ? targetUrl : undefined,
      selectedWebsite: selected === "website" ? website : undefined,
      contentType: selected === "website" ? contentType : undefined,
      platform: selected === "design" ? platform : undefined,
    });
    // Reset
    setSelected(null);
    setSelectedKeywords([]);
    setCustomKeyword("");
    setTargetUrl("");
    setSelectedWebsiteId("");
    setContentType("pages");
    setPlatform("wordpress");
    setBusinessNiche("");
    setAiSuggestions([]);
  };

  const canContinue = () => {
    if (!selected) return false;
    if (selected === "url" && !targetUrl.trim()) return false;
    if (selected === "website" && !selectedWebsiteId) return false;
    if (selected === "design" && !platform) return false;
    return true;
  };

  const displaySuggestions = aiSuggestions.length > 0 ? aiSuggestions : FALLBACK_KEYWORDS;
  const availableSuggestions = displaySuggestions.filter(k => !selectedKeywords.includes(k));
  const availableExisting = existingKeywords.filter(kw => !selectedKeywords.includes(kw.name));

  // Folder list (unique, sorted) + filter
  const folders = Array.from(new Set(availableExisting.map(k => k.folder).filter((f): f is string => !!f))).sort();
  const filteredExisting = availableExisting.filter(kw => {
    if (folderFilter === "__all__") return true;
    if (folderFilter === "__none__") return !kw.folder;
    return kw.folder === folderFilter;
  });
  // Group filtered keywords by folder for display
  const groupedExisting = filteredExisting.reduce<Record<string, typeof filteredExisting>>((acc, kw) => {
    const key = kw.folder || "__uncategorized__";
    (acc[key] ||= []).push(kw);
    return acc;
  }, {});
  const groupedKeys = Object.keys(groupedExisting).sort((a, b) => {
    if (a === "__uncategorized__") return 1;
    if (b === "__uncategorized__") return -1;
    return a.localeCompare(b);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <h2 className="text-lg font-bold">Create Template</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how to create, then define your dynamic keywords.
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

          {/* Conditional: Platform picker for "Design Your Own" */}
          {selected === "design" && (
            <div className="rounded-xl border bg-gradient-to-r from-primary/5 via-transparent to-transparent p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Target Platform</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Choose where this template will be used. The editor will scaffold platform-specific markup so it stays editable in the native page builder.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                      platform === p.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{p.icon}</span>
                      <span className="text-xs font-semibold">{p.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conditional: URL input */}
          {selected === "url" && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <Label className="text-xs font-semibold">Page URL to scan</Label>
              <Input
                placeholder="https://example.com/page"
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">The exact page design will be imported as your template.</p>
            </div>
          )}

          {/* Conditional: Website select + content type */}
          {selected === "website" && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
              <div className="space-y-2">
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

              {selectedWebsiteId && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">What do you want to import?</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {CONTENT_TYPES.map(ct => (
                      <button
                        key={ct.id}
                        onClick={() => setContentType(ct.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
                          contentType === ct.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <ct.icon className={`h-5 w-5 ${contentType === ct.id ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-semibold">{ct.label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{ct.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: AI Keyword Suggestions */}
          {selected && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                <span className="text-sm font-semibold">Smart Keywords (Variables)</span>
              </div>

              {/* AI Suggest */}
              <div className="rounded-xl border bg-gradient-to-r from-violet-500/5 via-transparent to-transparent p-4 mb-4 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  <span className="text-xs font-semibold">AI Keyword Suggestion</span>
                </div>
                <p className="text-[11px] text-muted-foreground">Describe your business and AI will suggest the best keywords for your template.</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. plumber, dentist, restaurant, real estate..."
                    value={businessNiche}
                    onChange={e => setBusinessNiche(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); suggestKeywords(); } }}
                    className="flex-1 h-9"
                  />
                  <Button size="sm" variant="outline" onClick={suggestKeywords} disabled={aiSuggesting || !businessNiche.trim()}>
                    {aiSuggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  </Button>
                </div>
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

              {/* Custom input */}
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder="Type a custom keyword..."
                  value={customKeyword}
                  onChange={e => setCustomKeyword(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomKeyword(); } }}
                  className="flex-1 h-9"
                />
                <Button size="sm" variant="outline" onClick={addCustomKeyword} disabled={!customKeyword.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Suggested keywords */}
              {availableSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {aiSuggestions.length > 0 ? "AI Suggested" : "Common Keywords"}
                  </span>
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

              {/* Existing PGP keywords (grouped by folder) */}
              {availableExisting.length > 0 && (
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">From your keyword groups</span>
                    {folders.length > 0 && (
                      <Select value={folderFilter} onValueChange={setFolderFilter}>
                        <SelectTrigger className="h-7 w-auto min-w-[140px] text-[11px]">
                          <FolderOpen className="h-3 w-3 mr-1 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All folders</SelectItem>
                          <SelectItem value="__none__">Uncategorized</SelectItem>
                          {folders.map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {filteredExisting.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic px-1">No keywords in this folder.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {groupedKeys.map(folderKey => (
                        <div key={folderKey} className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Folder className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                              {folderKey === "__uncategorized__" ? "Uncategorized" : folderKey}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">({groupedExisting[folderKey].length})</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pl-1">
                            {groupedExisting[folderKey].map(kw => (
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
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quality Target */}
          {selected && (
            <div className="rounded-xl border bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold">Quality Target: 90+ Score</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Templates are optimized for <strong>90%+ scores</strong> across SEO, SEA, and GEO.
                {selected === "ai" && " AI will generate content that meets this threshold."}
                {selected === "design" && " The editor shows live scoring to help you reach this target."}
                {selected === "url" && " AI will suggest improvements after scanning."}
                {selected === "website" && " Imported content is cleaned and ready for variable assignment."}
              </p>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px]">SEO 90+</Badge>
                <Badge variant="outline" className="text-primary border-primary text-[10px]">SEA 90+</Badge>
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
