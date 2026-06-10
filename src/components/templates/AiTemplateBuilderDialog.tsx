import { useState, useMemo, useEffect } from "react";
import { usePersistedSnapshot } from "@/hooks/use-persisted-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Code, Eye, Globe, Wand2, Zap, Layers, MousePointerClick, ArrowLeft, CheckCircle2, Palette, RefreshCw, Image as ImageIcon, Lock } from "lucide-react";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { ElementorEditor } from "@/components/templates/ElementorEditor";
import { filterDesignVars } from "@/lib/design-vars-filter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/use-subscription";

const AI_LANGUAGES = [
  { code: "en", label: "English" }, { code: "es", label: "Spanish" }, { code: "fr", label: "French" },
  { code: "de", label: "German" }, { code: "pt", label: "Portuguese" }, { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" }, { code: "ja", label: "Japanese" }, { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" }, { code: "ar", label: "Arabic" }, { code: "hi", label: "Hindi" },
  { code: "ru", label: "Russian" }, { code: "tr", label: "Turkish" }, { code: "pl", label: "Polish" },
  { code: "sv", label: "Swedish" }, { code: "da", label: "Danish" }, { code: "fi", label: "Finnish" },
  { code: "no", label: "Norwegian" }, { code: "el", label: "Greek" }, { code: "cs", label: "Czech" },
  { code: "ro", label: "Romanian" }, { code: "id", label: "Indonesian" }, { code: "th", label: "Thai" },
  { code: "vi", label: "Vietnamese" }, { code: "uk", label: "Ukrainian" }, { code: "hu", label: "Hungarian" },
  { code: "ms", label: "Malay" }, { code: "bn", label: "Bengali" },
];

const BUSINESS_TYPES = [
  { value: "service page", label: "Service Page", icon: "🔧" },
  { value: "product page", label: "Product Page", icon: "🛍️" },
  { value: "local business page", label: "Local Business", icon: "📍" },
  { value: "e-commerce store page", label: "E-Commerce", icon: "🛒" },
  { value: "portfolio page", label: "Portfolio", icon: "🎨" },
  { value: "landing page", label: "Landing Page", icon: "🚀" },
  { value: "restaurant page", label: "Restaurant", icon: "🍽️" },
  { value: "real estate listing page", label: "Real Estate", icon: "🏠" },
  { value: "course landing page", label: "Online Course", icon: "🎓" },
  { value: "blog post page", label: "Blog Post", icon: "📝" },
  { value: "event page", label: "Event Page", icon: "🎫" },
  { value: "booking/appointment page", label: "Booking", icon: "📅" },
];

const PLATFORMS = [
  { value: "wordpress", label: "WordPress / Elementor", icon: "🟦", desc: "Editable in Elementor", feature: "wordpress" as const },
  { value: "shopify", label: "Shopify", icon: "🛍️", desc: "Liquid-friendly markup", feature: "shopify" as const },
  { value: "prestashop", label: "PrestaShop", icon: "🛒", desc: "Smarty-compatible", feature: "prestashop" as const, comingSoon: true },
  { value: "generic", label: "Universal HTML", icon: "🌐", desc: "Works anywhere", feature: "shopify" as const },
];


const SECTIONS = [
  { value: "hero", label: "Hero Banner" },
  { value: "features", label: "Features / Services" },
  { value: "pricing", label: "Pricing" },
  { value: "testimonials", label: "Testimonials" },
  { value: "faq", label: "FAQ" },
  { value: "cta", label: "Call-to-Action" },
  { value: "gallery", label: "Gallery / Images" },
  { value: "contact", label: "Contact Form" },
  { value: "team", label: "Team / About" },
  { value: "stats", label: "Stats / Numbers" },
  { value: "products", label: "Product Grid" },
  { value: "map", label: "Location / Map" },
];

interface AiTemplateBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, content: string) => void;
  isSaving: boolean;
  /** Called when AI Content mode generates — opens editor with result */
  onContentGenerated?: (data: { name: string; content: string; variables: string[]; seoTitle: string; seoDescription: string }) => void;
}

export function AiTemplateBuilderDialog({ open, onOpenChange, onSave, isSaving, onContentGenerated }: AiTemplateBuilderDialogProps) {
  const [mode, setMode] = useState<"builder" | "content">("builder");
  const [step, setStep] = useState<"configure" | "review">("configure");
  const { features, plan } = useSubscription();

  // Whether a platform can be selected on the current plan.
  // PrestaShop is always locked (Coming Soon) regardless of plan.
  const isPlatformLocked = (p: typeof PLATFORMS[number]) =>
    p.comingSoon || !features[p.feature];

  const renderPlatformPicker = () => (
    <div>
      <Label className="flex items-center gap-2 text-sm font-semibold mb-2">
        <Layers className="h-4 w-4 text-primary" /> Target Platform
      </Label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PLATFORMS.map((p) => {
          const locked = isPlatformLocked(p);
          return (
            <button
              key={p.value}
              type="button"
              disabled={locked}
              onClick={() => !locked && setPlatform(p.value)}
              className={`relative flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all overflow-hidden ${
                p.comingSoon
                  ? "border-amber-500/40 bg-amber-500/5 cursor-not-allowed"
                  : locked
                    ? "border-border bg-muted/40 opacity-60 cursor-not-allowed"
                    : platform === p.value
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-accent"
              }`}
            >
              {p.comingSoon ? (
                <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-black shadow-sm">
                  <Lock className="h-2.5 w-2.5" /> Coming Soon
                </span>
              ) : locked ? (
                <Lock className="absolute top-1.5 right-1.5 h-3 w-3 text-muted-foreground" />
              ) : null}
              <div className={`flex items-center gap-1.5 ${p.comingSoon ? "opacity-70" : ""}`}>
                <span className="text-base">{p.icon}</span>
                <span className="text-xs font-semibold">{p.label}</span>
              </div>
              <span className={`text-[10px] ${p.comingSoon ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                {p.comingSoon ? "Not available yet" : locked ? "Upgrade to unlock" : p.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );



  // Builder state
  const [businessType, setBusinessType] = useState("");
  const [niche, setNiche] = useState("");
  const [language, setLanguage] = useState("en");
  const [sections, setSections] = useState<string[]>(["hero", "features", "testimonials", "faq", "cta"]);
  const [extraDetails, setExtraDetails] = useState("");
  const [includeHeaderFooter, setIncludeHeaderFooter] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedName, setGeneratedName] = useState("");
  const [platform, setPlatform] = useState("wordpress");

  // Reset to WordPress if the selected platform isn't available on this plan.
  useEffect(() => {
    const current = PLATFORMS.find(p => p.value === platform);
    if (current && isPlatformLocked(current)) setPlatform("wordpress");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, features]);

  // Theme color controls
  const [themeMode, setThemeMode] = useState<"auto" | "website" | "custom">("auto");
  const [websiteId, setWebsiteId] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState("#1f2937");
  const [accentColor, setAccentColor] = useState("#f59e0b");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#111827");
  const [themeFont, setThemeFont] = useState("");
  const [extracting, setExtracting] = useState(false);

  // Background image controls
  const ASPECT_RATIOS = [
    { v: "21/9", label: "21:9", desc: "Cinematic" },
    { v: "16/9", label: "16:9", desc: "Widescreen" },
    { v: "4/3", label: "4:3", desc: "Classic" },
    { v: "1/1", label: "1:1", desc: "Square" },
    { v: "auto", label: "Auto", desc: "Min-height" },
  ];
  const [heroAspectDesktop, setHeroAspectDesktop] = useState<string>("auto");
  const [heroAspectMobile, setHeroAspectMobile] = useState<string>("4/3");
  // Focal point: percentage from top-left (50/50 = center)
  const [focalX, setFocalX] = useState<number>(50);
  const [focalY, setFocalY] = useState<number>(40);

  const websitesQuery = useQuery({
    queryKey: ["websites-for-theme"],
    queryFn: async () => {
      const { data, error } = await supabase.from("websites").select("id, name, url").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const extractColors = async (id: string) => {
    if (!id) return;
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-site-colors", { body: { website_id: id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const c = data.colors || {};
      if (c.primary) setPrimaryColor(c.primary);
      if (c.accent) setAccentColor(c.accent);
      if (c.background) setBgColor(c.background);
      if (c.text) setTextColor(c.text);
      if (data.fonts?.[0]) setThemeFont(data.fonts[0]);
      toast({ title: "Colors extracted", description: `Primary ${c.primary || "—"} · Background ${c.background || "—"}` });
    } catch (err: any) {
      toast({ title: "Could not extract colors", description: err.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };


  // Quick Content state
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiContentType, setAiContentType] = useState("seo");
  const [aiNiche, setAiNiche] = useState("");

  // Auto-save / auto-restore builder progress so users don't lose work
  // when they switch tabs or accidentally close the dialog.
  const builderSnapshot = useMemo(() => ({
    mode, step,
    businessType, niche, language, sections, extraDetails, includeHeaderFooter,
    generatedContent, generatedName, platform,
    themeMode, websiteId, primaryColor, accentColor, bgColor, textColor, themeFont,
    heroAspectDesktop, heroAspectMobile, focalX, focalY,
    aiKeywords, aiContentType, aiNiche,
  }), [
    mode, step, businessType, niche, language, sections, extraDetails, includeHeaderFooter,
    generatedContent, generatedName, platform,
    themeMode, websiteId, primaryColor, accentColor, bgColor, textColor, themeFont,
    heroAspectDesktop, heroAspectMobile, focalX, focalY,
    aiKeywords, aiContentType, aiNiche,
  ]);

  const clearBuilderSnapshot = usePersistedSnapshot(
    "ai-template-builder",
    builderSnapshot,
    (s: any) => {
      if (!s || typeof s !== "object") return;
      try {
        if (typeof s.mode === "string") setMode(s.mode);
        if (typeof s.step === "string") setStep(s.step);
        if (typeof s.businessType === "string") setBusinessType(s.businessType);
        if (typeof s.niche === "string") setNiche(s.niche);
        if (typeof s.language === "string") setLanguage(s.language);
        if (Array.isArray(s.sections)) setSections(s.sections);
        if (typeof s.extraDetails === "string") setExtraDetails(s.extraDetails);
        if (typeof s.includeHeaderFooter === "boolean") setIncludeHeaderFooter(s.includeHeaderFooter);
        if (typeof s.generatedContent === "string") setGeneratedContent(s.generatedContent);
        if (typeof s.generatedName === "string") setGeneratedName(s.generatedName);
        if (typeof s.platform === "string") setPlatform(s.platform);
        if (typeof s.themeMode === "string") setThemeMode(s.themeMode);
        if (typeof s.websiteId === "string") setWebsiteId(s.websiteId);
        if (typeof s.primaryColor === "string") setPrimaryColor(s.primaryColor);
        if (typeof s.accentColor === "string") setAccentColor(s.accentColor);
        if (typeof s.bgColor === "string") setBgColor(s.bgColor);
        if (typeof s.textColor === "string") setTextColor(s.textColor);
        if (typeof s.themeFont === "string") setThemeFont(s.themeFont);
        if (typeof s.heroAspectDesktop === "string") setHeroAspectDesktop(s.heroAspectDesktop);
        if (typeof s.heroAspectMobile === "string") setHeroAspectMobile(s.heroAspectMobile);
        if (typeof s.focalX === "number") setFocalX(s.focalX);
        if (typeof s.focalY === "number") setFocalY(s.focalY);
        if (typeof s.aiKeywords === "string") setAiKeywords(s.aiKeywords);
        if (typeof s.aiContentType === "string") setAiContentType(s.aiContentType);
        if (typeof s.aiNiche === "string") setAiNiche(s.aiNiche);
      } catch { /* corrupt snapshot — ignore */ }
    },
    { version: 1 },
  );

  const { toast } = useToast();

  const buildPrompt = () => {
    const parts: string[] = [];
    if (businessType) parts.push(`Create a ${businessType} template`);
    else parts.push("Create a landing page template");
    if (niche) parts.push(`for ${niche}`);
    if (sections.length > 0) parts.push(`with the following sections: ${sections.join(", ")}`);
    if (language !== "en") {
      const langLabel = AI_LANGUAGES.find(l => l.code === language)?.label || language;
      parts.push(`. Generate ALL text content in ${langLabel}`);
    }
    const platformLabel = PLATFORMS.find(p => p.value === platform)?.label || platform;
    parts.push(`. Target platform: ${platformLabel} — ensure markup is fully compatible and editable in this platform's native page builder`);
    if (extraDetails) parts.push(`. Additional details: ${extraDetails}`);
    return parts.join(" ");
  };

  const buildThemePayload = () => {
    if (themeMode === "auto") return { themeColors: undefined, themeFonts: undefined };
    return {
      themeColors: { primary: primaryColor, accent: accentColor, background: bgColor, text: textColor },
      themeFonts: themeFont ? [themeFont] : undefined,
    };
  };

  const buildBackgroundPayload = () => ({
    backgroundImage: {
      aspectDesktop: heroAspectDesktop,
      aspectMobile: heroAspectMobile,
      focalX,
      focalY,
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const theme = buildThemePayload();
      const bg = buildBackgroundPayload();
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: { prompt, includeHeaderFooter, platform, niche, businessType, keywords: niche, ...theme, ...bg },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { content: string; variables: string[]; suggestedName: string };
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setGeneratedName(data.suggestedName);
      setStep("review");
      toast({ title: "Template generated", description: "Niche-relevant images included. Review, edit and save." });
    },
    onError: (err: Error) => {
      // Centralised credit/error handling with "Top up" CTA
      import("@/lib/handle-api-error").then(({ handleApiError }) => handleApiError(err, { title: "Generation failed" }));
    },
  });

  const aiContentMutation = useMutation({
    mutationFn: async ({ keywords, contentType, niche: cNiche }: { keywords: string; contentType: string; niche: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-seo-content", {
        body: {
          keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
          contentType,
          niche: cNiche,
          platform,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { content: string; variables: string[]; suggestedName: string; seoTitle?: string; seoDescription?: string };
    },
    onSuccess: (data) => {
      if (onContentGenerated) {
        onContentGenerated({
          name: data.suggestedName,
          content: data.content,
          variables: data.variables || [],
          seoTitle: data.seoTitle || "",
          seoDescription: data.seoDescription || "",
        });
        handleClose();
      } else {
        setGeneratedContent(data.content);
        setGeneratedName(data.suggestedName);
        setStep("review");
      }
      toast({ title: "AI Content generated!" });
    },
    onError: (err: Error) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const detectedVars = filterDesignVars(
    (generatedContent.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || [])
  );

  const handleClose = () => {
    setGeneratedContent("");
    setGeneratedName("");
    setBusinessType("");
    setNiche("");
    setExtraDetails("");
    setLanguage("en");
    setPlatform("wordpress");
    setSections(["hero", "features", "testimonials", "faq", "cta"]);
    setIncludeHeaderFooter(false);
    setAiKeywords("");
    setAiContentType("seo");
    setAiNiche("");
    setMode("builder");
    setStep("configure");
    clearBuilderSnapshot();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="!w-[calc(100vw-1rem)] sm:!w-[calc(100vw-2rem)] !max-w-none max-h-[calc(100dvh-1rem)] sm:!max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Template Builder
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-2">
            <div className="flex items-center gap-1.5">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step === "configure" ? "bg-primary text-primary-foreground" : "bg-success text-success-foreground"}`}>
                {step === "review" ? <CheckCircle2 className="h-3.5 w-3.5" /> : "1"}
              </div>
              <span className={`text-xs font-medium ${step === "configure" ? "text-primary" : "text-success"}`}>Configure</span>
            </div>
            <div className="h-px flex-1 bg-border max-w-[120px]" />
            <div className="flex items-center gap-1.5">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step === "review" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                2
              </div>
              <span className={`text-xs font-medium ${step === "review" ? "text-primary" : "text-muted-foreground"}`}>Review &amp; Edit</span>
            </div>
          </div>
        </DialogHeader>

        {/* Mode Tabs — only in configure step */}
        {step === "configure" && (
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="builder" className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Full Builder
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Quick Content
            </TabsTrigger>
          </TabsList>

          {/* ─── Full Builder Mode ─── */}
          <TabsContent value="builder" className="space-y-5 mt-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">What type of template do you need?</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {BUSINESS_TYPES.map((bt) => (
                  <button
                    key={bt.value}
                    type="button"
                    onClick={() => setBusinessType(bt.value)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                      businessType === bt.value
                        ? "border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30"
                        : "border-border bg-card hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span className="text-lg">{bt.icon}</span>
                    <span>{bt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Globe className="h-4 w-4 text-primary" /> Template Language
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-10 border-primary/30 bg-primary/5">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {AI_LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-1">
                  Business niche / products / services <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g., Dental clinic, Organic skincare, Plumbing repair, Yoga classes..."
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className={!niche ? "border-primary/40 ring-1 ring-primary/20" : ""}
                />
                <p className="text-[11px] text-muted-foreground">
                  🎨 AI will generate niche-relevant images matching your business — be specific!
                </p>
              </div>
            </div>

            {/* Platform picker */}
            {renderPlatformPicker()}

            <div>
              <Label className="text-sm font-semibold mb-2 block">Sections to include</Label>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((sec) => {
                  const selected = sections.includes(sec.value);
                  return (
                    <button
                      key={sec.value}
                      type="button"
                      onClick={() => setSections(prev => selected ? prev.filter(s => s !== sec.value) : [...prev, sec.value])}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted/50 text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {selected ? "✓ " : ""}{sec.label}
                    </button>
                  );
                })}
              </div>
            </div>


            {/* ─── Theme Colors ─── */}
            <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Theme colors</Label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "auto", label: "Auto", desc: "Inherit from site" },
                  { v: "website", label: "From website", desc: "Pull live colors" },
                  { v: "custom", label: "Custom", desc: "Pick your own" },
                ].map((m) => (
                  <button
                    key={m.v}
                    type="button"
                    onClick={() => setThemeMode(m.v as any)}
                    className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border text-left transition-all ${
                      themeMode === m.v ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border bg-card hover:bg-accent"
                    }`}
                  >
                    <span className="text-xs font-semibold">{m.label}</span>
                    <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                  </button>
                ))}
              </div>

              {themeMode === "auto" && (
                <p className="text-[11px] text-muted-foreground">
                  ✨ Template uses <code>color: inherit</code> so it adopts your connected website's theme automatically when published.
                </p>
              )}

              {themeMode === "website" && (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={websiteId} onValueChange={(v) => { setWebsiteId(v); extractColors(v); }}>
                      <SelectTrigger className="flex-1 h-9">
                        <SelectValue placeholder="Pick a connected website" />
                      </SelectTrigger>
                      <SelectContent>
                        {(websitesQuery.data ?? []).map((w: any) => (
                          <SelectItem key={w.id} value={w.id}>{w.name} · {w.url}</SelectItem>
                        ))}
                        {(!websitesQuery.data || websitesQuery.data.length === 0) && (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">No websites connected yet</div>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => extractColors(websiteId)}
                      disabled={!websiteId || extracting}
                    >
                      {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      <span className="ml-1.5">Re-scan</span>
                    </Button>
                  </div>
                  {websiteId && (
                    <p className="text-[11px] text-muted-foreground">
                      Tip: you can still tweak any color below before generating.
                    </p>
                  )}
                </div>
              )}

              {themeMode !== "auto" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Primary", value: primaryColor, set: setPrimaryColor },
                    { label: "Accent", value: accentColor, set: setAccentColor },
                    { label: "Background", value: bgColor, set: setBgColor },
                    { label: "Text", value: textColor, set: setTextColor },
                  ].map((c) => (
                    <div key={c.label} className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">{c.label}</Label>
                      <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
                        <input
                          type="color"
                          value={c.value}
                          onChange={(e) => c.set(e.target.value)}
                          className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                        />
                        <Input
                          value={c.value}
                          onChange={(e) => c.set(e.target.value)}
                          className="h-6 px-1 text-xs font-mono border-0 shadow-none focus-visible:ring-0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {themeMode !== "auto" && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Font family (optional)</Label>
                  <Input
                    value={themeFont}
                    onChange={(e) => setThemeFont(e.target.value)}
                    placeholder="e.g., Inter, Poppins, Roboto"
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            {/* ─── Background image controls ─── */}
            <div className="rounded-xl border border-border bg-muted/20 p-3 sm:p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Background image — aspect ratio &amp; focal point</Label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Controls how hero/CTA background images crop on each screen size, so the important part of the photo always stays visible.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Desktop aspect ratio</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {ASPECT_RATIOS.map((r) => (
                      <button
                        key={r.v}
                        type="button"
                        onClick={() => setHeroAspectDesktop(r.v)}
                        title={r.desc}
                        className={`px-1.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${
                          heroAspectDesktop === r.v
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                            : "border-border bg-card hover:bg-accent"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">Mobile aspect ratio</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {ASPECT_RATIOS.map((r) => (
                      <button
                        key={r.v}
                        type="button"
                        onClick={() => setHeroAspectMobile(r.v)}
                        title={r.desc}
                        className={`px-1.5 py-1.5 rounded-md border text-[11px] font-medium transition-all ${
                          heroAspectMobile === r.v
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                            : "border-border bg-card hover:bg-accent"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Focal point picker */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  Focal point ({focalX}% × {focalY}%) — click on the preview to set what stays centered when cropped
                </Label>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
                    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
                    setFocalX(x);
                    setFocalY(y);
                  }}
                  className="relative w-full aspect-[16/9] rounded-md border border-border bg-cover bg-center cursor-crosshair overflow-hidden select-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, rgba(0,0,0,.45), rgba(0,0,0,.25)), url('https://picsum.photos/seed/focal-preview/800/450')",
                  }}
                >
                  <div
                    className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-lg ring-2 ring-primary/40 pointer-events-none"
                    style={{ left: `${focalX}%`, top: `${focalY}%` }}
                  />
                  <div className="absolute inset-x-0 border-t border-white/30 pointer-events-none" style={{ top: `${focalY}%` }} />
                  <div className="absolute inset-y-0 border-l border-white/30 pointer-events-none" style={{ left: `${focalX}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { l: "Top", x: 50, y: 15 },
                    { l: "Center", x: 50, y: 50 },
                    { l: "Bottom", x: 50, y: 85 },
                  ].map((p) => (
                    <button
                      key={p.l}
                      type="button"
                      onClick={() => { setFocalX(p.x); setFocalY(p.y); }}
                      className="px-2 py-1 rounded-md border border-border bg-card text-[11px] hover:bg-accent"
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">

              <Textarea
                placeholder="Any specific requirements... e.g., 'include comparison table', 'focus on local SEO'"
                value={extraDetails}
                onChange={(e) => setExtraDetails(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={includeHeaderFooter} onCheckedChange={setIncludeHeaderFooter} id="ai-hf" />
              <Label htmlFor="ai-hf" className="text-sm cursor-pointer">Include header & footer (uncheck to use your website's)</Label>
            </div>

            {(businessType || niche) && (
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1 font-medium">AI will generate based on:</p>
                <p className="text-sm text-foreground">{buildPrompt()}</p>
              </div>
            )}

            <Button
              onClick={() => generateMutation.mutate(buildPrompt())}
              disabled={!businessType || !niche.trim() || generateMutation.isPending}
              className="w-full"
              size="lg"
            >
              {generateMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating template...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Generate Template</>
              )}
            </Button>
            {(!businessType || !niche.trim()) && (
              <p className="text-[11px] text-center text-muted-foreground">
                ⚠️ Please pick a template type and enter your business niche so AI can generate matching images.
              </p>
            )}
          </TabsContent>

          {/* ─── Quick Content Mode ─── */}
          <TabsContent value="content" className="space-y-5 mt-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground">
                Quickly generate SEO-optimized content from keywords. The AI will create a complete template with proper structure, meta tags, and dynamic variables.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-1">
                Business niche / products / services <span className="text-destructive">*</span>
              </Label>
              <Input
                value={aiNiche}
                onChange={(e) => setAiNiche(e.target.value)}
                placeholder="e.g., Plumbing services, Online yoga classes, Vegan bakery..."
                className={!aiNiche ? "border-primary/40 ring-1 ring-primary/20" : ""}
              />
              <p className="text-[11px] text-muted-foreground">🎨 AI will generate niche-relevant images matching your business — be specific.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Keywords / services / products (comma-separated)</Label>
              <Input
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
                placeholder="plumbing, new york, emergency repair, 24/7 service"
              />
            </div>

            {renderPlatformPicker()}

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Content Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "seo", label: "SEO Landing Page", icon: "🔍", desc: "Organic search optimized" },
                  { value: "sea", label: "SEA Landing Page", icon: "📢", desc: "Paid ads conversion focused" },
                  { value: "geo", label: "GEO Local Page", icon: "📍", desc: "Location-based targeting" },
                ].map(ct => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setAiContentType(ct.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                      aiContentType === ct.value
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border hover:bg-accent"
                    }`}
                  >
                    <span className="text-xl">{ct.icon}</span>
                    <span className="text-xs font-medium">{ct.label}</span>
                    <span className="text-[10px] text-muted-foreground">{ct.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => aiContentMutation.mutate({ keywords: aiKeywords, contentType: aiContentType, niche: aiNiche })}
              disabled={!aiKeywords.trim() || !aiNiche.trim() || aiContentMutation.isPending}
              className="w-full"
              size="lg"
            >
              {aiContentMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating content...</>
              ) : (
                <><Zap className="mr-2 h-4 w-4" /> Generate Content</>
              )}
            </Button>
            {(!aiKeywords.trim() || !aiNiche.trim()) && (
              <p className="text-[11px] text-center text-muted-foreground">
                ⚠️ Please enter your niche and keywords so AI can generate matching images.
              </p>
            )}
          </TabsContent>
        </Tabs>
        )}

        {/* ─── Step 2: Review & Edit ─── */}
        {step === "review" && generatedContent && (
          <div className="space-y-4 mt-2">
            <div className="rounded-xl border border-success/30 bg-success/5 p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-success-foreground">Your template is ready!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use <strong>Visual Edit</strong> to click & change colors, text, fonts. Switch to <strong>Preview</strong> to see the final look, or <strong>Code</strong> for raw HTML.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Template Name</Label>
              <Input value={generatedName} onChange={(e) => setGeneratedName(e.target.value)} />
            </div>

            <Tabs defaultValue="visual" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="visual" className="flex items-center gap-1.5">
                  <MousePointerClick className="h-3.5 w-3.5" /> Visual Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5" /> Code
                </TabsTrigger>
              </TabsList>
              <TabsContent value="visual" className="mt-3">
                <div className="rounded-lg border border-border overflow-hidden bg-background" style={{ minHeight: "60vh" }}>
                  <ElementorEditor
                    html={generatedContent}
                    onChange={(html) => setGeneratedContent(html)}
                    preserveOriginalStyles
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  💡 Click any element (heading, text, button, image) to edit its content, colors, fonts and spacing. Changes save automatically.
                </p>
              </TabsContent>
              <TabsContent value="preview" className="mt-3">
                <TemplatePreview html={generatedContent} />
              </TabsContent>
              <TabsContent value="code" className="mt-3">
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  rows={14}
                  className="font-mono text-xs"
                />
              </TabsContent>
            </Tabs>

            {detectedVars.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground">Content variables:</span>
                {[...new Set(detectedVars)].map((v) => (
                  <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                ))}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => { setStep("configure"); setGeneratedContent(""); setGeneratedName(""); }}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back & Regenerate
              </Button>
              <div className="flex gap-2 sm:justify-end">
                <Button variant="outline" onClick={() => { setGeneratedContent(""); setGeneratedName(""); setStep("configure"); }}>
                  Discard
                </Button>
                <Button
                  onClick={() => onSave(generatedName, generatedContent)}
                  disabled={!generatedName || !generatedContent || isSaving}
                  className="min-w-[140px]"
                >
                  {isSaving ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}