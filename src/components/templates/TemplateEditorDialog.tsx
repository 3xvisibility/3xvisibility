import { useState, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Code, Eye, FileText, Globe, Braces, Columns, LayoutPanelTop,
  Sparkles, Loader2, Trash2, Wand2, Plus,
} from "lucide-react";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { TemplateVisualEditor, blocksToHtml, htmlToBlocks, type TemplateBlock } from "@/components/templates/TemplateVisualEditor";
import { ElementorEditor } from "@/components/templates/ElementorEditor";
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
  open,
  onOpenChange,
  editingTemplate,
  onSave,
  isSaving,
}: TemplateEditorDialogProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [activeTab, setActiveTab] = useState<string>("code");
  const [elementorJson, setElementorJson] = useState<string | undefined>();

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
  const [aiAutoFixing, setAiAutoFixing] = useState(false);

  const { toast } = useToast();

  // Load template data when editing
  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setContent(editingTemplate.content);
      setBlocks(htmlToBlocks(editingTemplate.content));
      setSeoTitlePattern((editingTemplate as any).seo_title_pattern || "");
      setSeoDescriptionPattern((editingTemplate as any).seo_description_pattern || "");
      setSchemaType((editingTemplate as any).schema_type || "WebPage");
      const cfg = (editingTemplate as any).schema_config || {};
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
    }
  }, [editingTemplate]);

  const detectedVars = filterDesignVars(
    (content.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || [])
  );
  const uniqueVars = [...new Set(detectedVars)];

  const handleBlocksChange = useCallback((newBlocks: TemplateBlock[]) => {
    setBlocks(newBlocks);
    setContent(blocksToHtml(newBlocks));
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    if (tab === "visual" && activeTab !== "visual") {
      setBlocks(htmlToBlocks(content));
    }
    setActiveTab(tab);
  }, [activeTab, content]);

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
      name, content,
      seoTitlePattern, seoDescriptionPattern,
      schemaType, schemaConfig: buildSchemaConfig(),
    });
  };

  const handleClose = () => {
    setName(""); setContent(""); setBlocks([]); setActiveTab("code");
    setSeoTitlePattern(""); setSeoDescriptionPattern("");
    setSlugPattern(""); setCanonicalUrlPattern("");
    setSchemaType("WebPage");
    setPostType("page"); setExcerptPattern("");
    setCustomFields([]); setHeaderCode(""); setFooterCode("");
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
      <DialogContent className="sm:w-[min(96vw,72rem)] sm:max-w-none max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label>Template Name</Label>
            <Input placeholder="e.g., Service Landing Page" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-4 sm:grid-cols-7">
              <TabsTrigger value="elementor" className="text-xs sm:text-sm gap-1.5">
                <Columns className="h-3.5 w-3.5" /> Builder
              </TabsTrigger>
              <TabsTrigger value="visual" className="text-xs sm:text-sm gap-1.5">
                <LayoutPanelTop className="h-3.5 w-3.5" /> Blocks
              </TabsTrigger>
              <TabsTrigger value="code" className="text-xs sm:text-sm gap-1.5">
                <Code className="h-3.5 w-3.5" /> Code
              </TabsTrigger>
              <TabsTrigger value="fields" className="text-xs sm:text-sm gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Fields
              </TabsTrigger>
              <TabsTrigger value="seo" className="text-xs sm:text-sm gap-1.5">
                <Globe className="h-3.5 w-3.5" /> SEO
              </TabsTrigger>
              <TabsTrigger value="schema" className="text-xs sm:text-sm gap-1.5">
                <Braces className="h-3.5 w-3.5" /> Schema
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs sm:text-sm gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="elementor" className="mt-3">
              <ElementorEditor html={content} onChange={setContent} elementorJson={elementorJson} />
            </TabsContent>
            <TabsContent value="visual" className="mt-3">
              <TemplateVisualEditor blocks={blocks} onChange={handleBlocksChange} />
            </TabsContent>
            <TabsContent value="code" className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">Use &#123;variable&#125; syntax for dynamic fields.</p>
              <Textarea
                placeholder={"<h1>{product_name} in {city}</h1>\n<p>Best {product_name} services in {city}...</p>"}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={14}
                className="font-mono text-xs"
              />
            </TabsContent>
            <TabsContent value="fields" className="mt-3">
              <div className="space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">WordPress / CMS Fields</p>
                  <p className="text-xs text-muted-foreground">Configure post type, taxonomies, custom fields for CMS publishing.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Post Type</Label>
                    <Select value={postType} onValueChange={setPostType}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="page">Page</SelectItem>
                        <SelectItem value="post">Post</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Excerpt Pattern</Label>
                    <Input value={excerptPattern} onChange={(e) => setExcerptPattern(e.target.value)} placeholder="Short description with {variables}" className="text-sm h-9" />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Categories</Label>
                    <Input value={taxonomyCategories} onChange={(e) => setTaxonomyCategories(e.target.value)} placeholder="{category}, Services" className="text-sm h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Tags</Label>
                    <Input value={taxonomyTags} onChange={(e) => setTaxonomyTags(e.target.value)} placeholder="{keyword}, {city}" className="text-sm h-9" />
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Custom Fields (Post Meta)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCustomFields([...customFields, { key: "", value: "" }])}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {customFields.map((field, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input placeholder="Meta Key" value={field.key} onChange={(e) => { const u = [...customFields]; u[idx] = { ...u[idx], key: e.target.value }; setCustomFields(u); }} className="font-mono text-sm h-8 flex-1" />
                      <Input placeholder="Meta Value {variable}" value={field.value} onChange={(e) => { const u = [...customFields]; u[idx] = { ...u[idx], value: e.target.value }; setCustomFields(u); }} className="font-mono text-sm h-8 flex-[2]" />
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium">Comments</Label>
                    <p className="text-[11px] text-muted-foreground">Allow comments on generated pages</p>
                  </div>
                  <Switch checked={commentsEnabled} onCheckedChange={setCommentsEnabled} />
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-xs font-medium">Header & Footer Code Injection</Label>
                  <Textarea placeholder='<link rel="stylesheet" href="...">' value={headerCode} onChange={(e) => setHeaderCode(e.target.value)} rows={2} className="font-mono text-xs" />
                  <Textarea placeholder='<script src="..."></script>' value={footerCode} onChange={(e) => setFooterCode(e.target.value)} rows={2} className="font-mono text-xs" />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="seo" className="mt-3">
              <div className="space-y-4">
                {/* AI SEO Generator */}
                <div className="p-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Describe your business for AI-generated SEO patterns</p>
                  <Input placeholder="e.g., Dental clinic, Organic skincare shop..." value={aiSeoNiche} onChange={(e) => setAiSeoNiche(e.target.value)} className="text-sm" />
                  <Button variant="outline" className="w-full border-primary/40" disabled={aiSeoGenerating || !aiSeoNiche.trim()} onClick={generateAiSeo}>
                    {aiSeoGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4 text-primary" /> AI Generate SEO Patterns</>}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label>Meta Title Pattern</Label>
                  <Input placeholder="e.g., {product_name} in {city} | Brand" value={seoTitlePattern} onChange={(e) => setSeoTitlePattern(e.target.value)} className="font-mono text-sm" />
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${seoTitleLen <= 50 ? 'bg-emerald-500' : seoTitleLen <= 60 ? 'bg-amber-500' : 'bg-destructive'}`} style={{ width: `${Math.min((seoTitleLen / 70) * 100, 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">~{seoTitleLen}/60 chars</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Meta Description Pattern</Label>
                  <Textarea placeholder="e.g., Find the best {product_name} in {city}. Contact us today!" value={seoDescriptionPattern} onChange={(e) => setSeoDescriptionPattern(e.target.value)} rows={3} className="font-mono text-sm" />
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${seoDescLen >= 120 && seoDescLen <= 160 ? 'bg-emerald-500' : seoDescLen >= 100 ? 'bg-amber-500' : 'bg-muted'}`} style={{ width: `${Math.min((seoDescLen / 180) * 100, 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">~{seoDescLen}/160 chars</p>
                </div>
                {/* SERP Preview */}
                {(seoTitlePattern || seoDescriptionPattern) && (
                  <div className="rounded-xl border p-4 space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Google Search Preview</p>
                    <p className="text-[#1a0dab] text-lg leading-snug truncate" style={{ fontFamily: 'Arial, sans-serif' }}>
                      {seoTitlePattern ? seoTitlePattern.replace(/\{([^}]+)\}/g, (_, v) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ')) : name || 'Page Title'}
                    </p>
                    <p className="text-[#006621] text-sm truncate" style={{ fontFamily: 'Arial, sans-serif' }}>
                      example.com/{slugPattern ? slugPattern.replace(/\{([^}]+)\}/g, (_, v) => v.replace(/_/g, '-')) : 'page-slug'}
                    </p>
                    <p className="text-[#545454] text-sm leading-relaxed line-clamp-2" style={{ fontFamily: 'Arial, sans-serif' }}>
                      {seoDescriptionPattern ? seoDescriptionPattern.replace(/\{([^}]+)\}/g, (_, v) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ')) : 'Meta description...'}
                    </p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Slug Pattern</Label>
                    <Input placeholder="{product_name}-{city}" value={slugPattern} onChange={(e) => setSlugPattern(normalizeSlug(e.target.value))} className="font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Canonical URL</Label>
                    <Input placeholder="https://example.com/{slug}" value={canonicalUrlPattern} onChange={(e) => setCanonicalUrlPattern(e.target.value)} className="font-mono text-sm" />
                  </div>
                </div>
                <Separator />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open Graph & Twitter</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">OG Title</Label>
                    <Input placeholder="Defaults to Meta Title" value={ogTitlePattern} onChange={(e) => setOgTitlePattern(e.target.value)} className="font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">OG Description</Label>
                    <Input placeholder="Defaults to Meta Description" value={ogDescriptionPattern} onChange={(e) => setOgDescriptionPattern(e.target.value)} className="font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">OG Image URL</Label>
                    <Input placeholder="https://example.com/images/{slug}.jpg" value={ogImagePattern} onChange={(e) => setOgImagePattern(e.target.value)} className="font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Twitter Card</Label>
                    <Select value={twitterCard} onValueChange={setTwitterCard}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {uniqueVars.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Available variables:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {uniqueVars.map((v) => (
                        <Badge key={v} variant="outline" className="text-xs font-mono cursor-pointer hover:bg-accent" onClick={() => navigator.clipboard.writeText(v)}>{v}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="schema" className="mt-3">
              <div className="space-y-4">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Structured Data (JSON-LD)</p>
                  <p className="text-xs text-muted-foreground">Auto-generated schema markup based on template type.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Schema Type</Label>
                  <Select value={schemaType} onValueChange={setSchemaType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["WebPage", "LocalBusiness", "Product", "Service", "Article", "FAQPage", "Course", "Event", "Restaurant", "RealEstateAgent", "Organization"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="preview" className="mt-3">
              <TemplatePreview html={content} />
              {/* Live scores */}
              {content && (() => {
                const seo = calculateContentSeoScore("Sample Title", content, "sample-slug");
                const sea = calculateContentSeaScore("Sample Title", content, "sample-slug");
                const geo = calculateContentGeoScore("Sample Title", content, "sample-slug");
                return (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center gap-1.5 rounded-xl border p-3">
                      <span className="text-xs font-medium text-muted-foreground">SEO</span>
                      <SeoScoreBadge score={seo.score} label={seo.label} color={seo.color} checks={seo.checks} size="md" scoreType="SEO" />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 rounded-xl border p-3">
                      <span className="text-xs font-medium text-muted-foreground">SEA</span>
                      <SeoScoreBadge score={sea.score} label={sea.label} color={sea.color} checks={sea.checks} size="md" scoreType="SEA" />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 rounded-xl border p-3">
                      <span className="text-xs font-medium text-muted-foreground">GEO</span>
                      <SeoScoreBadge score={geo.score} label={geo.label} color={geo.color} checks={geo.checks} size="md" scoreType="GEO" />
                    </div>
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>

          {/* Variables display */}
          {uniqueVars.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground">Content variables:</span>
              {uniqueVars.map((v) => (
                <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name || !content || isSaving}>
              {isSaving ? "Saving..." : editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
