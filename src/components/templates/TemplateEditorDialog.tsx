import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code, Eye, Globe, Braces, X,
  Sparkles, Loader2, Trash2, Plus, FileText, Link, Image, MessageSquare, Tags, Settings2,
} from "lucide-react";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { DynamicElementsInserter } from "@/components/templates/DynamicElementsInserter";
import { ElementorEditor } from "@/components/templates/ElementorEditor";
import { LayoutPanelTop } from "lucide-react";
import { SeoScoreBadge } from "@/components/SeoScoreBadge";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";
import { filterDesignVars } from "@/lib/design-vars-filter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LiveSerpPreview } from "@/components/templates/LiveSerpPreview";
import type { Tables } from "@/integrations/supabase/types";

type Template = Tables<"templates">;

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: Template | null;
  onSave: (data: {
    name: string;
    content: string;
    seoTitlePattern: string;
    seoDescriptionPattern: string;
    schemaType: string;
    schemaConfig: Record<string, any>;
  }) => void;
  isSaving: boolean;
}

export function TemplateEditorDialog({
  open, onOpenChange, editingTemplate, onSave, isSaving,
}: TemplateEditorDialogProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [viewMode, setViewMode] = useState<"code" | "builder" | "preview">("code");
  const [activeTab, setActiveTab] = useState("content");

  // SEO
  const [seoTitlePattern, setSeoTitlePattern] = useState("");
  const [seoDescriptionPattern, setSeoDescriptionPattern] = useState("");
  const [slugPattern, setSlugPattern] = useState("");
  const [canonicalUrlPattern, setCanonicalUrlPattern] = useState("");
  const [ogTitlePattern, setOgTitlePattern] = useState("");
  const [ogDescriptionPattern, setOgDescriptionPattern] = useState("");
  const [ogImagePattern, setOgImagePattern] = useState("");
  const [twitterCard, setTwitterCard] = useState("summary_large_image");

  // Schema
  const [schemaType, setSchemaType] = useState("WebPage");

  // PGP Fields
  const [postType, setPostType] = useState("page");
  const [excerptPattern, setExcerptPattern] = useState("");
  const [featuredImageSource, setFeaturedImageSource] = useState("none");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [taxonomyCategories, setTaxonomyCategories] = useState("");
  const [taxonomyTags, setTaxonomyTags] = useState("");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [headerCode, setHeaderCode] = useState("");
  const [footerCode, setFooterCode] = useState("");
  const [showInSearch, setShowInSearch] = useState(true);
  const [showSeoSettings, setShowSeoSettings] = useState(true);

  // Comment Generation
  const [generateComments, setGenerateComments] = useState(false);
  const [commentCount, setCommentCount] = useState("3");
  const [commentAuthors, setCommentAuthors] = useState("");
  const [commentTemplate, setCommentTemplate] = useState("");

  // Author & Attributes
  const [authorMode, setAuthorMode] = useState("default");
  const [authorList, setAuthorList] = useState("");
  const [parentPage, setParentPage] = useState("");
  const [menuAssignment, setMenuAssignment] = useState("");
  const [pageTemplate, setPageTemplate] = useState("default");

  // AI SEO
  const [aiSeoNiche, setAiSeoNiche] = useState("");
  const [aiSeoGenerating, setAiSeoGenerating] = useState(false);
  const [aiImproving, setAiImproving] = useState(false);

  const { toast } = useToast();

  const resetAllFields = useCallback(() => {
    setName(""); setContent(""); setViewMode("code"); setActiveTab("content");
    setSeoTitlePattern(""); setSeoDescriptionPattern("");
    setSlugPattern(""); setCanonicalUrlPattern("");
    setOgTitlePattern(""); setOgDescriptionPattern("");
    setOgImagePattern(""); setTwitterCard("summary_large_image");
    setSchemaType("WebPage"); setPostType("page");
    setExcerptPattern(""); setFeaturedImageSource("none");
    setFeaturedImageUrl(""); setTaxonomyCategories("");
    setTaxonomyTags(""); setCommentsEnabled(true);
    setCustomFields([]); setHeaderCode(""); setFooterCode("");
    setAiSeoNiche(""); setShowInSearch(true); setShowSeoSettings(true);
    setGenerateComments(false); setCommentCount("3"); setCommentAuthors(""); setCommentTemplate("");
    setAuthorMode("default"); setAuthorList(""); setParentPage(""); setMenuAssignment(""); setPageTemplate("default");
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editingTemplate) {
      setName(editingTemplate.name);
      setContent(editingTemplate.content);
      setSeoTitlePattern(editingTemplate.seo_title_pattern || "");
      setSeoDescriptionPattern(editingTemplate.seo_description_pattern || "");
      setSchemaType(editingTemplate.schema_type || "WebPage");
      const cfg = (editingTemplate.schema_config as Record<string, any>) || {};
      setSlugPattern(cfg._slugPattern || "");
      setCanonicalUrlPattern(cfg._canonicalUrl || "");
      setOgTitlePattern(cfg._ogTitle || "");
      setOgDescriptionPattern(cfg._ogDescription || "");
      setOgImagePattern(cfg._ogImage || "");
      setTwitterCard(cfg._twitterCard || "summary_large_image");
      setPostType(cfg._postType || "page");
      setExcerptPattern(cfg._excerptPattern || "");
      setFeaturedImageSource(cfg._featuredImageSource || "none");
      setFeaturedImageUrl(cfg._featuredImageUrl || "");
      setTaxonomyCategories(cfg._taxonomyCategories || "");
      setTaxonomyTags(cfg._taxonomyTags || "");
      setCommentsEnabled(cfg._commentsEnabled !== false);
      setCustomFields(cfg._customFields || []);
      setHeaderCode(cfg._headerCode || "");
      setFooterCode(cfg._footerCode || "");
      setShowInSearch(cfg._showInSearch !== false);
      setShowSeoSettings(cfg._showSeoSettings !== false);
      setGenerateComments(cfg._generateComments || false);
      setCommentCount(cfg._commentCount || "3");
      setCommentAuthors(cfg._commentAuthors || "");
      setCommentTemplate(cfg._commentTemplate || "");
      setAuthorMode(cfg._authorMode || "default");
      setAuthorList(cfg._authorList || "");
      setParentPage(cfg._parentPage || "");
      setMenuAssignment(cfg._menuAssignment || "");
      setPageTemplate(cfg._pageTemplate || "default");
      setViewMode("code");
      setActiveTab("content");
      setAiSeoNiche("");
    } else {
      resetAllFields();
    }
  }, [editingTemplate, open, resetAllFields]);

  const detectedVars = filterDesignVars(
    (content.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || [])
  );
  const uniqueVars = [...new Set(detectedVars)];

  const normalizeSlug = (input: string) =>
    input.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9{}\-\/]/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");

  const buildSchemaConfig = () => ({
    _slugPattern: slugPattern, _canonicalUrl: canonicalUrlPattern,
    _ogTitle: ogTitlePattern, _ogDescription: ogDescriptionPattern,
    _ogImage: ogImagePattern, _twitterCard: twitterCard,
    _postType: postType, _excerptPattern: excerptPattern,
    _featuredImageSource: featuredImageSource, _featuredImageUrl: featuredImageUrl,
    _taxonomyCategories: taxonomyCategories, _taxonomyTags: taxonomyTags,
    _commentsEnabled: commentsEnabled, _customFields: customFields,
    _headerCode: headerCode, _footerCode: footerCode,
    _showInSearch: showInSearch, _showSeoSettings: showSeoSettings,
    _generateComments: generateComments, _commentCount: commentCount,
    _commentAuthors: commentAuthors, _commentTemplate: commentTemplate,
    _authorMode: authorMode, _authorList: authorList,
    _parentPage: parentPage, _menuAssignment: menuAssignment,
    _pageTemplate: pageTemplate,
  });

  const handleSave = () => {
    onSave({
      name, content, seoTitlePattern, seoDescriptionPattern,
      schemaType, schemaConfig: buildSchemaConfig(),
    });
  };

  const handleClose = () => {
    resetAllFields();
    onOpenChange(false);
  };

  const seoTitleLen = seoTitlePattern.replace(/\{[^}]+\}/g, "xxxxx").length;
  const seoDescLen = seoDescriptionPattern.replace(/\{[^}]+\}/g, "xxxxx").length;

  const generateAiSeo = async () => {
    setAiSeoGenerating(true);
    try {
      const vars = [...new Set(content.match(/\{([a-z_]+)\}/gi) || [])];
      const varNames = vars.map(v => v.replace(/[{}]/g, "")).join(", ");
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: {
          prompt: `You are an SEO expert. Generate ONLY two lines of text for a "${aiSeoNiche}" business.
The template has these content variables: ${varNames || "keyword, city"}

Line 1: An SEO-optimized meta title pattern (under 60 chars) using relevant variables from the list above.
Line 2: An SEO-optimized meta description pattern (120-160 chars) using the same variables.

Use {variable_name} syntax. Do NOT output HTML, markdown, or explanations — just two plain text lines.`
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const raw = (data.content || "").replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      const lines = raw.split("\n").map((l: string) => l.replace(/^(line\s*\d+\s*[:：]\s*)/i, "").replace(/^(meta\s*(title|description)\s*(pattern)?\s*[:：]\s*)/i, "").trim()).filter(Boolean);
      if (lines[0]) setSeoTitlePattern(lines[0]);
      if (lines[1]) setSeoDescriptionPattern(lines[1]);
      toast({ title: "SEO patterns generated!" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setAiSeoGenerating(false);
    }
  };

  const aiImproveContent = async () => {
    if (!content.trim()) return;
    setAiImproving(true);
    try {
      const vars = [...new Set(content.match(/\{([a-z_]+)\}/gi) || [])];
      const varNames = vars.map(v => v.replace(/[{}]/g, "")).join(", ");
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: {
          prompt: `FULL PREMIUM REDESIGN TASK — rebuild the page below into a stunning, modern, award-winning landing page from scratch, exactly the way a top design agency (Linear / Vercel / Stripe / Framer caliber) would build it. Do NOT just tweak the existing markup — completely re-author the HTML and CSS into a flagship-quality design, fully committing to the DESIGN DIRECTION you were assigned in the system prompt.

ABSOLUTE RULES:
- Preserve EVERY existing {variable_name} placeholder so dynamic data still works: ${varNames || "none detected"}
- Keep the same business topic, purpose, and language as the original.
- Preserve any {{AI:...}} blocks and add 1-2 more for unique hero/about copy if missing.
- Rebuild the layout with the full design playbook: cinematic multi-layer hero, animated gradient orbs, glassmorphic/gradient cards, fluid clamp() typography, gradient-text section headings, scroll-snap testimonials carousel, styled FAQ, and a dramatic final CTA band.
- Keep it conversion-optimized and SEO-strong: clear single H1, logical h2/h3 hierarchy, 300+ words of quality content, descriptive image alt text, FAQ + trust signals.
- Make it fully responsive and accessible (WCAG AA contrast).
- Return ONLY the finished HTML, no explanations or markdown fences.

ORIGINAL TEMPLATE TO REDESIGN (use its content/variables as the source of truth):
${content}`
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      let improved = (data.content || "").replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      if (improved) {
        setContent(improved);
        toast({ title: "✨ Content improved!", description: "Template has been enhanced for better SEO, SEA & GEO scores." });
      }
    } catch (err: any) {
      toast({ title: "AI improvement failed", description: err.message, variant: "destructive" });
    } finally {
      setAiImproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:w-[min(96vw,72rem)] sm:max-w-none max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] flex flex-col overflow-hidden p-0 gap-0">
        
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-5 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold leading-tight truncate">
                {editingTemplate?.id ? "Edit Template" : "New Template"}
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                {uniqueVars.length > 0 ? `${uniqueVars.length} variable(s) detected` : "Use {variable} syntax in content"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quality scores inline (desktop only) */}
            {content && (() => {
              const seo = calculateContentSeoScore("Sample", content, "slug");
              const sea = calculateContentSeaScore("Sample", content, "slug");
              const geo = calculateContentGeoScore("Sample", content, "slug");
              return (
                <div className="hidden lg:flex items-center gap-1.5 mr-2">
                  <SeoScoreBadge score={seo.score} label={seo.label} color={seo.color} checks={seo.checks} size="sm" scoreType="SEO" />
                  <SeoScoreBadge score={sea.score} label={sea.label} color={sea.color} checks={sea.checks} size="sm" scoreType="SEA" />
                  <SeoScoreBadge score={geo.score} label={geo.label} color={geo.color} checks={geo.checks} size="sm" scoreType="GEO" />
                </div>
              );
            })()}
            <Button variant="outline" size="sm" onClick={handleClose} className="h-8 px-2 sm:px-3 text-xs sm:text-sm">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!name || !content || isSaving} className="h-8 px-2.5 sm:px-3 text-xs sm:text-sm">
              {isSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1.5" /> <span className="hidden sm:inline">Saving...</span></> : (editingTemplate?.id ? <><span className="hidden sm:inline">Save Changes</span><span className="sm:hidden">Save</span></> : <><span className="hidden sm:inline">Create Template</span><span className="sm:hidden">Create</span></>)}
            </Button>
          </div>
        </div>

        {/* ── Title Bar (always visible, like WP post title) ── */}
        <div className="px-5 py-3 border-b bg-background shrink-0">
          <Input
            placeholder="Enter template title — e.g. {service_name} in {city}"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-base font-medium h-11 border-dashed"
          />
        </div>

        {/* ── Tab Navigation ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="border-b bg-muted/30 px-5 shrink-0 overflow-x-auto">
            <TabsList className="h-auto bg-transparent p-0 gap-0 w-auto inline-flex">
              {[
                { value: "content", label: "Content", icon: Code },
                { value: "seo", label: "SEO", icon: Globe },
                { value: "permalink", label: "Permalink", icon: Link },
                { value: "image", label: "Image", icon: Image },
                { value: "fields", label: "Fields", icon: Braces },
                { value: "publish", label: "Publish", icon: Settings2 },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs font-medium gap-1.5"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* ── Content Tab ── */}
            {/* ── Content Tab ── */}
            <TabsContent value="content" className="m-0 flex flex-col flex-1 min-h-0" forceMount={activeTab === "content" ? true : undefined} hidden={activeTab !== "content"}>
              <div className="flex items-center gap-2 px-3 sm:px-5 py-2 border-b bg-muted/20 shrink-0 overflow-x-auto">
                <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 shrink-0">
                  <button
                    onClick={() => setViewMode("code")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${viewMode === "code" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Code className="h-3 w-3 inline mr-1" /> Code
                  </button>
                  <button
                    onClick={() => setViewMode("builder")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${viewMode === "builder" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <LayoutPanelTop className="h-3 w-3 inline mr-1" /> Builder
                  </button>
                  <button
                    onClick={() => setViewMode("preview")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${viewMode === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Eye className="h-3 w-3 inline mr-1" /> Preview
                  </button>
                </div>
                <div className="h-4 w-px bg-border shrink-0" />
                <button
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50 shrink-0"
                  disabled={aiImproving || !content.trim()}
                  onClick={aiImproveContent}
                >
                  {aiImproving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  <span className="hidden sm:inline">{aiImproving ? "Improving…" : "AI Improve"}</span>
                </button>
                <DynamicElementsInserter onInsert={(shortcode) => setContent(prev => prev + shortcode)} />
                {uniqueVars.length > 0 && (
                  <div className="hidden md:flex items-center gap-1.5 overflow-x-auto ml-auto">
                    <span className="text-[10px] text-muted-foreground shrink-0">Vars:</span>
                    {uniqueVars.slice(0, 6).map((v) => (
                      <Badge
                        key={v}
                        variant="outline"
                        className="text-[10px] font-mono cursor-pointer hover:bg-primary/10 shrink-0"
                        onClick={() => { navigator.clipboard.writeText(`{${v.replace(/[{}]/g, "")}}`); toast({ title: "Copied!" }); }}
                      >
                        {v}
                      </Badge>
                    ))}
                    {uniqueVars.length > 6 && <span className="text-[10px] text-muted-foreground">+{uniqueVars.length - 6}</span>}
                  </div>
                )}
              </div>

              {/* Editor / Builder / Preview area */}
              <div className="flex-1 min-h-[50vh]">
                {viewMode === "preview" ? (
                  <div className="h-full">
                    <TemplatePreview html={content} />
                  </div>
                ) : viewMode === "builder" ? (
                  <div className="h-full min-h-[60vh]">
                    <ElementorEditor
                      html={content}
                      onChange={(html) => setContent(html)}
                      customVars={uniqueVars}
                    />
                  </div>
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={`<!-- Write your template HTML here -->\n<div class="pgp-page">\n  <section class="hero-section">\n    <h1>{service_name} in {city}</h1>\n    <p>Professional {service_name} services in {city}, {state}.</p>\n    <a href="#contact" class="btn cta">Get a Free Quote</a>\n  </section>\n\n  <section class="features-grid">\n    <div class="feature-card">\n      <h3>Why Choose Us</h3>\n      <p>Trusted by thousands in {city}.</p>\n    </div>\n  </section>\n</div>`}
                    className="w-full h-full min-h-[50vh] p-4 font-mono text-sm bg-background resize-none border-0 focus:outline-none focus:ring-0"
                    spellCheck={false}
                  />
                )}
              </div>
            </TabsContent>

            {/* ── SEO Tab ── */}
            <TabsContent value="seo" className="m-0 p-5 space-y-5">
              {/* AI SEO Generator */}
              <div className="rounded-xl border bg-gradient-to-r from-primary/5 via-transparent to-transparent p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">AI SEO Generator</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter your business niche — e.g. plumber, dentist, restaurant"
                    value={aiSeoNiche}
                    onChange={(e) => setAiSeoNiche(e.target.value)}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button size="sm" onClick={generateAiSeo} disabled={aiSeoGenerating || !aiSeoNiche.trim()}>
                    {aiSeoGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                    Generate
                  </Button>
                </div>
              </div>

              {/* Meta Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Meta Title</Label>
                <Input
                  placeholder="{service_name} in {city} | Your Brand"
                  value={seoTitlePattern}
                  onChange={(e) => setSeoTitlePattern(e.target.value)}
                  className="font-mono text-sm h-9"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${seoTitleLen <= 50 ? 'bg-emerald-500' : seoTitleLen <= 60 ? 'bg-amber-500' : 'bg-destructive'}`}
                      style={{ width: `${Math.min((seoTitleLen / 70) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">{seoTitleLen}/60</span>
                </div>
              </div>

              {/* Meta Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Meta Description</Label>
                <Textarea
                  placeholder="Find the best {service_name} in {city}. Professional, affordable, and reliable."
                  value={seoDescriptionPattern}
                  onChange={(e) => setSeoDescriptionPattern(e.target.value)}
                  rows={2}
                  className="font-mono text-sm"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${seoDescLen >= 120 && seoDescLen <= 160 ? 'bg-emerald-500' : seoDescLen >= 100 ? 'bg-amber-500' : 'bg-muted-foreground/20'}`}
                      style={{ width: `${Math.min((seoDescLen / 180) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">{seoDescLen}/160</span>
                </div>
              </div>

              {/* Live SERP & Social Preview — reflects every SEO field below */}


              {/* Open Graph & Social */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open Graph & Social</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">OG Title</Label>
                    <Input placeholder="Defaults to Meta Title" value={ogTitlePattern} onChange={(e) => setOgTitlePattern(e.target.value)} className="font-mono text-xs h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">OG Description</Label>
                    <Input placeholder="Defaults to Meta Description" value={ogDescriptionPattern} onChange={(e) => setOgDescriptionPattern(e.target.value)} className="font-mono text-xs h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">OG Image URL</Label>
                    <Input placeholder="https://..." value={ogImagePattern} onChange={(e) => setOgImagePattern(e.target.value)} className="font-mono text-xs h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Twitter Card</Label>
                    <Select value={twitterCard} onValueChange={setTwitterCard}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <LiveSerpPreview
                seoTitle={seoTitlePattern}
                seoDescription={seoDescriptionPattern}
                ogTitle={ogTitlePattern}
                ogDescription={ogDescriptionPattern}
                ogImage={ogImagePattern}
                twitterCard={twitterCard}
                slugPattern={slugPattern}
                canonicalUrlPattern={canonicalUrlPattern}
                templateName={name}
              />
            </TabsContent>

            {/* ── Permalink Tab ── */}
            <TabsContent value="permalink" className="m-0 p-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Slug Pattern</Label>
                <Input
                  placeholder="{service_name}-{city}"
                  value={slugPattern}
                  onChange={(e) => setSlugPattern(normalizeSlug(e.target.value))}
                  className="font-mono text-sm h-10"
                />
                <p className="text-[11px] text-muted-foreground">URL-friendly slug for each generated page. Use {"{variables}"} for dynamic slugs.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Canonical URL</Label>
                <Input
                  placeholder="https://example.com/{slug}"
                  value={canonicalUrlPattern}
                  onChange={(e) => setCanonicalUrlPattern(e.target.value)}
                  className="font-mono text-sm h-10"
                />
                <p className="text-[11px] text-muted-foreground">Set the canonical URL to avoid duplicate content issues.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Excerpt</Label>
                <Textarea
                  value={excerptPattern}
                  onChange={(e) => setExcerptPattern(e.target.value)}
                  placeholder="Professional {service_name} in {city}. Contact us for a free quote."
                  rows={2}
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground">Short summary used for search results and page listings.</p>
              </div>
            </TabsContent>

            {/* ── Image Tab ── */}
            <TabsContent value="image" className="m-0 p-5 space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Featured Image Source</Label>
                <Select value={featuredImageSource} onValueChange={setFeaturedImageSource}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="url">Image URL</SelectItem>
                    <SelectItem value="pexels">Pexels (auto search)</SelectItem>
                    <SelectItem value="pixabay">Pixabay (auto search)</SelectItem>
                    <SelectItem value="ai">AI Generated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {featuredImageSource !== "none" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{featuredImageSource === "url" ? "Image URL Pattern" : "Search Term Pattern"}</Label>
                  <Input
                    value={featuredImageUrl}
                    onChange={(e) => setFeaturedImageUrl(e.target.value)}
                    placeholder={featuredImageSource === "url" ? "https://example.com/images/{slug}.jpg" : "{service_name} {city}"}
                    className="text-sm h-10"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {featuredImageSource === "url"
                      ? "Direct URL to the image. Variables will be replaced."
                      : featuredImageSource === "ai"
                      ? "AI will generate an image based on this prompt."
                      : "Search term to find a relevant stock photo."}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* ── Fields Tab (Taxonomies, Custom Fields, Discussion) ── */}
            <TabsContent value="fields" className="m-0 p-5 space-y-6">
              {/* Taxonomies */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Tags className="h-3.5 w-3.5" /> Taxonomies
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Categories</Label>
                    <Input value={taxonomyCategories} onChange={(e) => setTaxonomyCategories(e.target.value)} placeholder="{category}, Services" className="text-sm h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tags</Label>
                    <Input value={taxonomyTags} onChange={(e) => setTaxonomyTags(e.target.value)} placeholder="{keyword}, {city}" className="text-sm h-9" />
                  </div>
                </div>
              </div>

              {/* Custom Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Braces className="h-3.5 w-3.5" /> Custom Fields (Post Meta)
                  </p>
                  {customFields.length > 0 && <Badge variant="secondary" className="text-[10px]">{customFields.length}</Badge>}
                </div>
                <div className="space-y-2">
                  {customFields.map((field, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input placeholder="Meta Key" value={field.key} onChange={(e) => { const u = [...customFields]; u[idx] = { ...u[idx], key: e.target.value }; setCustomFields(u); }} className="font-mono text-xs h-8 flex-1" />
                      <Input placeholder="Value {variable}" value={field.value} onChange={(e) => { const u = [...customFields]; u[idx] = { ...u[idx], value: e.target.value }; setCustomFields(u); }} className="font-mono text-xs h-8 flex-[2]" />
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setCustomFields([...customFields, { key: "", value: "" }])}>
                    <Plus className="h-3 w-3 mr-1" /> Add Field
                  </Button>
                </div>
              </div>

              {/* Discussion */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Discussion
                </p>
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Allow Comments</p>
                    <p className="text-[11px] text-muted-foreground">Enable comments on generated pages</p>
                  </div>
                  <Switch checked={commentsEnabled} onCheckedChange={setCommentsEnabled} />
                </div>
              </div>

              {/* Comment Generation */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Generate Comments
                </p>
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Auto-generate comments</p>
                    <p className="text-[11px] text-muted-foreground">Create realistic comments for each generated post</p>
                  </div>
                  <Switch checked={generateComments} onCheckedChange={setGenerateComments} />
                </div>
                {generateComments && (
                  <div className="space-y-3 pl-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Number of Comments</Label>
                        <Input type="number" min="1" max="20" value={commentCount} onChange={(e) => setCommentCount(e.target.value)} className="text-sm h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Comment Authors</Label>
                        <Input value={commentAuthors} onChange={(e) => setCommentAuthors(e.target.value)} placeholder="John, Jane, {name}" className="text-sm h-9" />
                        <p className="text-[10px] text-muted-foreground">Comma-separated. Supports spintax & variables.</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Comment Template</Label>
                      <Textarea value={commentTemplate} onChange={(e) => setCommentTemplate(e.target.value)} placeholder="Great {service} in {city}! {Highly recommended|Would use again}." rows={2} className="text-sm" />
                      <p className="text-[10px] text-muted-foreground">Use spintax and keywords for unique comments.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Author & Attributes */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5" /> Author & Attributes
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Author Assignment</Label>
                    <Select value={authorMode} onValueChange={setAuthorMode}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Author</SelectItem>
                        <SelectItem value="specific">Specific Author</SelectItem>
                        <SelectItem value="random">Random from List</SelectItem>
                        <SelectItem value="rotate">Rotate through List</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {authorMode !== "default" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Author List</Label>
                      <Input value={authorList} onChange={(e) => setAuthorList(e.target.value)} placeholder="Author1, Author2, Author3" className="text-sm h-9" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Parent Page</Label>
                    <Input value={parentPage} onChange={(e) => setParentPage(e.target.value)} placeholder="Enter parent page slug or ID" className="text-sm h-9" />
                    <p className="text-[10px] text-muted-foreground">Assign generated pages under a parent page.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Page Template</Label>
                    <Select value={pageTemplate} onValueChange={setPageTemplate}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Template</SelectItem>
                        <SelectItem value="full-width">Full Width</SelectItem>
                        <SelectItem value="sidebar-left">Sidebar Left</SelectItem>
                        <SelectItem value="sidebar-right">Sidebar Right</SelectItem>
                        <SelectItem value="blank">Blank (No Header/Footer)</SelectItem>
                        <SelectItem value="elementor_canvas">Elementor Canvas</SelectItem>
                        <SelectItem value="elementor_header_footer">Elementor Full Width</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Menu Assignment</Label>
                  <Input value={menuAssignment} onChange={(e) => setMenuAssignment(e.target.value)} placeholder="Main Menu, Footer Menu" className="text-sm h-9" />
                  <p className="text-[10px] text-muted-foreground">Assign generated pages to WordPress menus. Comma-separated menu names.</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5" /> Header & Footer Code
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Header Code</Label>
                  <Textarea placeholder='<link rel="stylesheet" href="...">' value={headerCode} onChange={(e) => setHeaderCode(e.target.value)} rows={2} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Footer Code</Label>
                  <Textarea placeholder='<script src="..."></script>' value={footerCode} onChange={(e) => setFooterCode(e.target.value)} rows={2} className="font-mono text-xs" />
                </div>
              </div>
            </TabsContent>

            {/* ── Publish Tab ── */}
            <TabsContent value="publish" className="m-0 p-5 space-y-5">
              {/* Content Group Settings */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5" /> Content Group Settings
                </p>
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Show in search results?</p>
                    <p className="text-[11px] text-muted-foreground">Allow generated pages to be indexed by search engines</p>
                  </div>
                  <Switch checked={showInSearch} onCheckedChange={setShowInSearch} />
                </div>
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Show SEO settings?</p>
                    <p className="text-[11px] text-muted-foreground">Display SEO meta fields when editing generated pages</p>
                  </div>
                  <Switch checked={showSeoSettings} onCheckedChange={setShowSeoSettings} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Post Type</Label>
                  <Select value={postType} onValueChange={setPostType}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="page">Page</SelectItem>
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">WordPress post type for generated content.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Schema Type</Label>
                  <Select value={schemaType} onValueChange={setSchemaType}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["WebPage", "LocalBusiness", "Product", "Service", "Article", "FAQPage", "Course", "Event", "Restaurant", "RealEstateAgent", "Organization"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">JSON-LD structured data type for search engines.</p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
