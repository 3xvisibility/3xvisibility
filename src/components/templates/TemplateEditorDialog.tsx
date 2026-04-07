import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Code, Eye, Globe, Braces, ChevronDown, ChevronRight,
  Sparkles, Loader2, Trash2, Plus, FileText, Link, Image, MessageSquare, Tags,
} from "lucide-react";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
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

/* ─── Collapsible Section ──────────────────────────────────────────── */
function Section({ title, icon: Icon, defaultOpen = false, children, badge }: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors group">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-sm font-medium">{title}</span>
          {badge && <Badge variant="secondary" className="text-[10px] rounded-md">{badge}</Badge>}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pt-3 pb-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function TemplateEditorDialog({
  open, onOpenChange, editingTemplate, onSave, isSaving,
}: TemplateEditorDialogProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);

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
    setName(""); setContent(""); setShowPreview(false);
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
      <DialogContent className="sm:w-[min(96vw,64rem)] sm:max-w-none max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg">{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-4 mt-4">
          {/* ── Title ── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Title</Label>
            <Input
              placeholder="e.g., {service_name} in {city} – Professional Services"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base h-11"
            />
            <p className="text-[11px] text-muted-foreground">Use &#123;variable&#125; syntax. This becomes the page title during generation.</p>
          </div>

          {/* ── Content ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Content</Label>
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
            </div>

            {showPreview ? (
              <div className="border rounded-xl overflow-hidden min-h-[300px]">
                <TemplatePreview html={content} />
              </div>
            ) : (
              <Textarea
                placeholder={"<h1>{service_name} in {city}</h1>\n<p>Looking for the best {service_name} in {city}? We offer professional services...</p>\n<h2>Why Choose Us?</h2>\n<p>With over {years_experience} years of experience...</p>"}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="font-mono text-xs leading-relaxed"
              />
            )}

            {/* Detected variables */}
            {uniqueVars.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground font-medium">Variables:</span>
                {uniqueVars.map((v) => (
                  <Badge
                    key={v}
                    variant="outline"
                    className="text-[10px] font-mono cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => { navigator.clipboard.writeText(`{${v.replace(/[{}]/g, "")}}`); toast({ title: "Copied!" }); }}
                  >
                    {v}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* ── Permalink ── */}
          <Section title="Permalink" icon={Link}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Slug Pattern</Label>
                <Input placeholder="{service_name}-{city}" value={slugPattern} onChange={(e) => setSlugPattern(normalizeSlug(e.target.value))} className="font-mono text-sm h-9" />
                <p className="text-[11px] text-muted-foreground">The URL-friendly slug for each generated page.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Canonical URL</Label>
                <Input placeholder="https://example.com/{slug}" value={canonicalUrlPattern} onChange={(e) => setCanonicalUrlPattern(e.target.value)} className="font-mono text-sm h-9" />
              </div>
            </div>
          </Section>

          {/* ── Excerpt ── */}
          <Section title="Excerpt" icon={FileText}>
            <div className="space-y-1.5">
              <Input value={excerptPattern} onChange={(e) => setExcerptPattern(e.target.value)} placeholder="Professional {service_name} in {city}. Contact us for a free quote." className="text-sm h-9" />
              <p className="text-[11px] text-muted-foreground">Short summary used in search results and social shares.</p>
            </div>
          </Section>

          {/* ── Featured Image ── */}
          <Section title="Featured Image" icon={Image}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Image Source</Label>
                <Select value={featuredImageSource} onValueChange={setFeaturedImageSource}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="url">Image URL</SelectItem>
                    <SelectItem value="pexels">Pexels</SelectItem>
                    <SelectItem value="pixabay">Pixabay</SelectItem>
                    <SelectItem value="ai">AI Generated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {featuredImageSource !== "none" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{featuredImageSource === "url" ? "Image URL" : "Search Term"}</Label>
                  <Input value={featuredImageUrl} onChange={(e) => setFeaturedImageUrl(e.target.value)} placeholder={featuredImageSource === "url" ? "https://..." : "{service_name} {city}"} className="text-sm h-9" />
                </div>
              )}
            </div>
          </Section>

          {/* ── SEO / Meta ── */}
          <Section title="SEO & Meta Tags" icon={Globe} badge={seoTitlePattern ? "✓" : undefined}>
            <div className="space-y-4">
              {/* AI SEO Generator */}
              <div className="flex gap-2">
                <Input placeholder="Business niche for AI (e.g., Plumbing services)" value={aiSeoNiche} onChange={(e) => setAiSeoNiche(e.target.value)} className="text-sm h-9 flex-1" />
                <Button variant="outline" size="sm" className="h-9 shrink-0" disabled={aiSeoGenerating || !aiSeoNiche.trim()} onClick={generateAiSeo}>
                  {aiSeoGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Sparkles className="h-3.5 w-3.5 mr-1" /> AI Generate</>}
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Meta Title</Label>
                <Input placeholder="{service_name} in {city} | Your Brand" value={seoTitlePattern} onChange={(e) => setSeoTitlePattern(e.target.value)} className="font-mono text-sm h-9" />
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${seoTitleLen <= 50 ? 'bg-emerald-500' : seoTitleLen <= 60 ? 'bg-amber-500' : 'bg-destructive'}`} style={{ width: `${Math.min((seoTitleLen / 70) * 100, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">{seoTitleLen}/60</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Meta Description</Label>
                <Textarea placeholder="Find the best {service_name} in {city}. Professional, affordable, and reliable." value={seoDescriptionPattern} onChange={(e) => setSeoDescriptionPattern(e.target.value)} rows={2} className="font-mono text-sm" />
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${seoDescLen >= 120 && seoDescLen <= 160 ? 'bg-emerald-500' : seoDescLen >= 100 ? 'bg-amber-500' : 'bg-muted-foreground/20'}`} style={{ width: `${Math.min((seoDescLen / 180) * 100, 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-12 text-right">{seoDescLen}/160</span>
                </div>
              </div>

              {/* SERP Preview */}
              {(seoTitlePattern || seoDescriptionPattern) && (
                <div className="rounded-lg border p-3 bg-background space-y-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Search Preview</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">OG Title (optional)</Label>
                  <Input placeholder="Defaults to Meta Title" value={ogTitlePattern} onChange={(e) => setOgTitlePattern(e.target.value)} className="font-mono text-xs h-8" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">OG Description</Label>
                  <Input placeholder="Defaults to Meta Description" value={ogDescriptionPattern} onChange={(e) => setOgDescriptionPattern(e.target.value)} className="font-mono text-xs h-8" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">OG Image</Label>
                  <Input placeholder="https://..." value={ogImagePattern} onChange={(e) => setOgImagePattern(e.target.value)} className="font-mono text-xs h-8" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Twitter Card</Label>
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
          </Section>

          {/* ── Taxonomies ── */}
          <Section title="Taxonomies" icon={Tags}>
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
          </Section>

          {/* ── Custom Fields ── */}
          <Section title="Custom Fields" icon={Braces} badge={customFields.length > 0 ? `${customFields.length}` : undefined}>
            <div className="space-y-2">
              {customFields.map((field, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input placeholder="Meta Key" value={field.key} onChange={(e) => { const u = [...customFields]; u[idx] = { ...u[idx], key: e.target.value }; setCustomFields(u); }} className="font-mono text-xs h-8 flex-1" />
                  <Input placeholder="Value {variable}" value={field.value} onChange={(e) => { const u = [...customFields]; u[idx] = { ...u[idx], value: e.target.value }; setCustomFields(u); }} className="font-mono text-xs h-8 flex-[2]" />
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setCustomFields([...customFields, { key: "", value: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add Custom Field
              </Button>
            </div>
          </Section>

          {/* ── Discussion ── */}
          <Section title="Discussion" icon={MessageSquare}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Allow Comments</p>
                <p className="text-[11px] text-muted-foreground">Enable comments on generated pages</p>
              </div>
              <Switch checked={commentsEnabled} onCheckedChange={setCommentsEnabled} />
            </div>
          </Section>

          {/* ── Publish Settings ── */}
          <Section title="Publish Settings" icon={FileText}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Post Type</Label>
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
                <Label className="text-xs">Schema Type</Label>
                <Select value={schemaType} onValueChange={setSchemaType}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["WebPage", "LocalBusiness", "Product", "Service", "Article", "FAQPage", "Course", "Event", "Restaurant", "RealEstateAgent", "Organization"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          {/* ── Header & Footer Code ── */}
          <Section title="Header & Footer Code" icon={Code}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Header Code</Label>
                <Textarea placeholder='<link rel="stylesheet" href="...">' value={headerCode} onChange={(e) => setHeaderCode(e.target.value)} rows={2} className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Footer Code</Label>
                <Textarea placeholder='<script src="..."></script>' value={footerCode} onChange={(e) => setFooterCode(e.target.value)} rows={2} className="font-mono text-xs" />
              </div>
            </div>
          </Section>

          {/* ── Quality Scores (when content exists) ── */}
          {content && (() => {
            const seo = calculateContentSeoScore("Sample Title", content, "sample-slug");
            const sea = calculateContentSeaScore("Sample Title", content, "sample-slug");
            const geo = calculateContentGeoScore("Sample Title", content, "sample-slug");
            return (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center gap-1.5 rounded-xl border p-3">
                  <span className="text-[10px] font-medium text-muted-foreground">SEO</span>
                  <SeoScoreBadge score={seo.score} label={seo.label} color={seo.color} checks={seo.checks} size="md" scoreType="SEO" />
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border p-3">
                  <span className="text-[10px] font-medium text-muted-foreground">SEA</span>
                  <SeoScoreBadge score={sea.score} label={sea.label} color={sea.color} checks={sea.checks} size="md" scoreType="SEA" />
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-xl border p-3">
                  <span className="text-[10px] font-medium text-muted-foreground">GEO</span>
                  <SeoScoreBadge score={geo.score} label={geo.label} color={geo.color} checks={geo.checks} size="md" scoreType="GEO" />
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Sticky Footer ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-t bg-card">
          <p className="text-[11px] text-muted-foreground hidden sm:block">
            {uniqueVars.length > 0 ? `${uniqueVars.length} variable(s) detected` : "Add {variables} in your content"}
          </p>
          <div className="flex gap-2 ml-auto">
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
