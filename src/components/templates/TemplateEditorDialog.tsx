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
import { SeoScoreBadge } from "@/components/SeoScoreBadge";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";
import { filterDesignVars } from "@/lib/design-vars-filter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [showPreview, setShowPreview] = useState(false);
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

  // AI SEO
  const [aiSeoNiche, setAiSeoNiche] = useState("");
  const [aiSeoGenerating, setAiSeoGenerating] = useState(false);

  const { toast } = useToast();

  const resetAllFields = useCallback(() => {
    setName(""); setContent(""); setShowPreview(false); setActiveTab("content");
    setSeoTitlePattern(""); setSeoDescriptionPattern("");
    setSlugPattern(""); setCanonicalUrlPattern("");
    setOgTitlePattern(""); setOgDescriptionPattern("");
    setOgImagePattern(""); setTwitterCard("summary_large_image");
    setSchemaType("WebPage"); setPostType("page");
    setExcerptPattern(""); setFeaturedImageSource("none");
    setFeaturedImageUrl(""); setTaxonomyCategories("");
    setTaxonomyTags(""); setCommentsEnabled(true);
    setCustomFields([]); setHeaderCode(""); setFooterCode("");
    setAiSeoNiche("");
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
      setShowPreview(false);
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:w-[min(96vw,72rem)] sm:max-w-none max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] flex flex-col overflow-hidden p-0 gap-0">
        
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">
                {editingTemplate?.id ? "Edit Template" : "New Template"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {uniqueVars.length > 0 ? `${uniqueVars.length} variable(s) detected` : "Use {variable} syntax in content"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Quality scores inline */}
            {content && (() => {
              const seo = calculateContentSeoScore("Sample", content, "slug");
              const sea = calculateContentSeaScore("Sample", content, "slug");
              const geo = calculateContentGeoScore("Sample", content, "slug");
              return (
                <div className="hidden md:flex items-center gap-1.5 mr-2">
                  <SeoScoreBadge score={seo.score} label={seo.label} color={seo.color} checks={seo.checks} size="sm" scoreType="SEO" />
                  <SeoScoreBadge score={sea.score} label={sea.label} color={sea.color} checks={sea.checks} size="sm" scoreType="SEA" />
                  <SeoScoreBadge score={geo.score} label={geo.label} color={geo.color} checks={geo.checks} size="sm" scoreType="GEO" />
                </div>
              );
            })()}
            <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!name || !content || isSaving}>
              {isSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving...</> : editingTemplate?.id ? "Save Changes" : "Create Template"}
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
            <TabsContent value="content" className="m-0 flex flex-col" forceMount={activeTab === "content" ? true : undefined} hidden={activeTab !== "content"}>
              <div className="flex items-center justify-between px-5 py-2 border-b bg-muted/20 shrink-0">
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  <button
                    onClick={() => setShowPreview(false)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${!showPreview ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Code className="h-3 w-3 inline mr-1" /> Code
                  </button>
                  <button
                    onClick={() => setShowPreview(true)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${showPreview ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Eye className="h-3 w-3 inline mr-1" /> Preview
                  </button>
                </div>
                <DynamicElementsInserter onInsert={(shortcode) => setContent(prev => prev + shortcode)} />
                {uniqueVars.length > 0 && (
                  <div className="hidden md:flex items-center gap-1.5 overflow-x-auto max-w-[50%]">
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
              <div className="flex-1 min-h-0">
                {showPreview ? (
                  <div className="h-full">
                    <TemplatePreview html={content} />
                  </div>
                ) : (
                  <Textarea
                    placeholder={"<h1>{service_name} in {city}</h1>\n<p>Looking for the best {service_name} in {city}?</p>\n<h2>Why Choose Us?</h2>\n<p>With over {years_experience} years of experience...</p>"}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="font-mono text-xs leading-relaxed h-full min-h-[400px] rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                  />
                )}
              </div>
            </TabsContent>

            {/* ── SEO Tab ── */}
            <TabsContent value="seo" className="m-0 p-5 space-y-5">
              {/* AI Generator */}
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> AI SEO Generator
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Business niche (e.g., Plumbing services in NYC)"
                    value={aiSeoNiche}
                    onChange={(e) => setAiSeoNiche(e.target.value)}
                    className="text-sm h-9 flex-1"
                  />
                  <Button variant="outline" size="sm" className="h-9 shrink-0" disabled={aiSeoGenerating || !aiSeoNiche.trim()} onClick={generateAiSeo}>
                    {aiSeoGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Sparkles className="h-3.5 w-3.5 mr-1" /> Generate</>}
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

              {/* SERP Preview */}
              {(seoTitlePattern || seoDescriptionPattern) && (
                <div className="rounded-xl border p-4 bg-background space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Google Search Preview</p>
                  <p className="text-[#1a0dab] text-base leading-snug truncate" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {seoTitlePattern ? seoTitlePattern.replace(/\{([^}]+)\}/g, (_, v) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ')) : name || 'Page Title'}
                  </p>
                  <p className="text-[#006621] text-xs truncate" style={{ fontFamily: 'Arial, sans-serif' }}>
                    example.com/{slugPattern ? slugPattern.replace(/\{([^}]+)\}/g, (_, v) => v.replace(/_/g, '-')) : 'page-slug'}
                  </p>
                  <p className="text-[#545454] text-xs leading-relaxed line-clamp-2" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {seoDescriptionPattern ? seoDescriptionPattern.replace(/\{([^}]+)\}/g, (_, v) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ')) : 'Meta description...'}
                  </p>
                </div>
              )}

              {/* Open Graph */}
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

              {/* Header/Footer Code */}
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
