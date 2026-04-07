import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Code, Eye, Globe } from "lucide-react";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { filterDesignVars } from "@/lib/design-vars-filter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

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
}

export function AiTemplateBuilderDialog({ open, onOpenChange, onSave, isSaving }: AiTemplateBuilderDialogProps) {
  const [businessType, setBusinessType] = useState("");
  const [niche, setNiche] = useState("");
  const [language, setLanguage] = useState("en");
  const [sections, setSections] = useState<string[]>(["hero", "features", "testimonials", "faq", "cta"]);
  const [extraDetails, setExtraDetails] = useState("");
  const [includeHeaderFooter, setIncludeHeaderFooter] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedName, setGeneratedName] = useState("");
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
    if (extraDetails) parts.push(`. Additional details: ${extraDetails}`);
    return parts.join(" ");
  };

  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: { prompt, includeHeaderFooter },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { content: string; variables: string[]; suggestedName: string };
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setGeneratedName(data.suggestedName);
      toast({ title: "Template generated", description: "Review and save your template." });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
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
    setSections(["hero", "features", "testimonials", "faq", "cta"]);
    setIncludeHeaderFooter(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="sm:w-[min(96vw,72rem)] sm:max-w-none max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Template Builder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Step 1: Business Type */}
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

          {/* Step 2: Language & Niche */}
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
              <Label className="text-sm font-semibold">Business niche / industry</Label>
              <Input
                placeholder="e.g., Dental clinic, Organic skincare, Plumbing..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>
          </div>

          {/* Step 3: Sections */}
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

          {/* Step 4: Extra details */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Additional details (optional)</Label>
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

          {/* Prompt preview */}
          {(businessType || niche) && (
            <div className="p-3 rounded-xl bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1 font-medium">AI will generate based on:</p>
              <p className="text-sm text-foreground">{buildPrompt()}</p>
            </div>
          )}

          <Button
            onClick={() => generateMutation.mutate(buildPrompt())}
            disabled={(!businessType && !niche) || generateMutation.isPending}
            className="w-full"
            size="lg"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating your template...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Generate Template</>
            )}
          </Button>

          {/* Generated result */}
          {generatedContent && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="space-y-1.5">
                <Label>Template Name</Label>
                <Input value={generatedName} onChange={(e) => setGeneratedName(e.target.value)} />
              </div>

              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="preview" className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </TabsTrigger>
                  <TabsTrigger value="code" className="flex items-center gap-1.5">
                    <Code className="h-3.5 w-3.5" /> Code
                  </TabsTrigger>
                </TabsList>
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

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setGeneratedContent(""); setGeneratedName(""); }}>
                  Discard
                </Button>
                <Button
                  onClick={() => onSave(generatedName, generatedContent)}
                  disabled={!generatedName || !generatedContent || isSaving}
                >
                  {isSaving ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
