import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Store, Search, Download, Upload, Eye, Code, Star, Users, FileText,
  Tag, Globe, ShoppingBag, MapPin, Megaphone, Briefcase, GraduationCap,
  Heart, Loader2, Share2, MessageSquare, SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";
import { useToast } from "@/hooks/use-toast";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { SeoDefaultsEditor } from "@/components/templates/SeoDefaultsEditor";
import { LiveVariablePreview } from "@/components/templates/LiveVariablePreview";
import { ImageVariablePanel } from "@/components/templates/ImageVariablePanel";
import { ContentFieldsPanel } from "@/components/templates/ContentFieldsPanel";
import { RowMappingPreview } from "@/components/campaigns/RowMappingPreview";
import { downloadStarterCsv } from "@/lib/csv-starter";
import { exportTemplateZip } from "@/lib/template-export";
import { parseUploadedFile } from "@/lib/export-csv";
import { COMMUNITY_TEMPLATES, applyTemplateDefaults, type MarketplaceTemplate } from "@/lib/marketplace-templates";
import { useTranslatedTemplate } from "@/hooks/use-translated-template";
import { Languages } from "lucide-react";

// Known category metadata (icons + nice labels). Any category found on a
// template that isn't listed here still gets a pill automatically, so future
// niches/categories show up without code changes.
const CATEGORY_META: Record<string, { label: string; icon: typeof Store }> = {
  all: { label: "All", icon: Store },
  "local-seo": { label: "Local SEO", icon: MapPin },
  ecommerce: { label: "E-Commerce", icon: ShoppingBag },
  saas: { label: "SaaS / Tech", icon: Globe },
  marketing: { label: "Marketing", icon: Megaphone },
  professional: { label: "Professional", icon: Briefcase },
  education: { label: "Education", icon: GraduationCap },
  health: { label: "Health", icon: Heart },
  wordpress: { label: "WordPress", icon: FileText },
  shopify: { label: "Shopify", icon: ShoppingBag },
  prestashop: { label: "PrestaShop", icon: Tag },
  general: { label: "General", icon: Tag },
};

// Turn an arbitrary category id into a human-friendly label.
function categoryLabel(id: string): string {
  if (CATEGORY_META[id]) return CATEGORY_META[id].label;
  return id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function categoryMeta(id: string) {
  return CATEGORY_META[id] || { label: categoryLabel(id), icon: Tag };
}

// Localized labels for the generic categories. Brand names (WordPress, Shopify,
// PrestaShop) are intentionally omitted so they stay untranslated.
const CATEGORY_LABEL_I18N: Record<string, Partial<Record<Language, string>>> = {
  all: { fr: "Tous", de: "Alle", es: "Todos" },
  "local-seo": { fr: "SEO local", de: "Lokales SEO", es: "SEO local" },
  ecommerce: { fr: "E-commerce", de: "E-Commerce", es: "Comercio electrónico" },
  saas: { fr: "SaaS / Tech", de: "SaaS / Technik", es: "SaaS / Tecnología" },
  marketing: { fr: "Marketing", de: "Marketing", es: "Marketing" },
  professional: { fr: "Professionnel", de: "Professionell", es: "Profesional" },
  education: { fr: "Éducation", de: "Bildung", es: "Educación" },
  health: { fr: "Santé", de: "Gesundheit", es: "Salud" },
  general: { fr: "Général", de: "Allgemein", es: "General" },
};

// Resolve a category label for the active language, keeping brand names intact.
function localizedCategoryLabel(id: string, language: Language): string {
  return CATEGORY_LABEL_I18N[id]?.[language] ?? categoryMeta(id).label;
}




export default function TemplateMarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"browse" | "community">("browse");
  const [previewTemplate, setPreviewTemplate] = useState<MarketplaceTemplate | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareForm, setShareForm] = useState({ templateId: "", description: "", category: "general", authorName: "" });
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [uploadedCsv, setUploadedCsv] = useState<Record<string, string>[]>([]);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [contentOverrides, setContentOverrides] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  // Auto-translate the previewed template (content, name, SEO + default values)
  // into the active language (en/fr/de/es). English is returned untouched.
  const { template: activePreview, translating: previewTranslating } =
    useTranslatedTemplate(previewTemplate, language);

  // Reset uploaded CSV + image overrides when switching templates.
  useEffect(() => { setUploadedCsv([]); setImageOverrides({}); setContentOverrides({}); }, [previewTemplate?.id]);

  // Build preview rows with content + image overrides merged into every row.
  const previewRows = useMemo(() => {
    const base = uploadedCsv.length > 0
      ? uploadedCsv
      : (activePreview?.defaultValues ? [activePreview.defaultValues] : []);
    const overrides = { ...contentOverrides, ...imageOverrides };
    if (Object.keys(overrides).length === 0) return base;
    return base.map((row) => ({ ...row, ...overrides }));
  }, [uploadedCsv, activePreview, imageOverrides, contentOverrides]);

  const handleCsvUpload = async (file: File) => {
    try {
      const { rowData } = await parseUploadedFile(file);
      if (!rowData.length) {
        toast({ title: "Empty file", description: "No data rows found in that file.", variant: "destructive" });
        return;
      }
      setUploadedCsv(rowData);
      toast({ title: "CSV loaded", description: `${rowData.length} row(s) mapped to template variables.` });
    } catch (e) {
      toast({ title: "Could not read file", description: e instanceof Error ? e.message : "Unsupported file.", variant: "destructive" });
    }
  };

  // Fetch user's templates for sharing
  const { data: userTemplates = [] } = useQuery({
    queryKey: ["user-templates-share", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("id, name, content, variables")
        .eq("workspace_id", wsId!);
      if (error) throw error;
      return data;
    },
  });

  // Fetch community shared templates
  const { data: sharedTemplates = [], isLoading: loadingShared } = useQuery({
    queryKey: ["shared-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shared_templates")
        .select("*")
        .eq("is_approved", true)
        .order("downloads", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch ratings for shared templates
  const { data: allRatings = [] } = useQuery({
    queryKey: ["template-ratings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_ratings")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // Convert shared templates to MarketplaceTemplate format
  const communityTemplates: MarketplaceTemplate[] = useMemo(() => {
    return sharedTemplates.map((st: any) => {
      const ratings = allRatings.filter((r: any) => r.shared_template_id === st.id);
      const avgRating = ratings.length > 0
        ? Math.round(ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length * 10) / 10
        : 0;
      return {
        id: st.id,
        shared_id: st.id,
        name: st.description ? st.description.slice(0, 40) : `Template by ${st.author_name || "Anonymous"}`,
        description: st.description,
        content: st.content,
        variables: st.variables || [],
        category: st.category,
        tags: [],
        author: st.author_name || "Anonymous",
        downloads: st.downloads || 0,
        rating: avgRating,
        ratingCount: ratings.length,
        seo_title_pattern: st.seo_title_pattern,
        seo_description_pattern: st.seo_description_pattern,
        schema_type: st.schema_type,
        isShared: true,
      };
    });
  }, [sharedTemplates, allRatings]);

  // Merge built-in + community for "browse" tab
  const allTemplates = useMemo(() => {
    return [...COMMUNITY_TEMPLATES, ...communityTemplates];
  }, [communityTemplates]);

  // Build the category pill list dynamically from whatever templates exist on
  // the active tab. "All" is always first; every category present in the data
  // gets a pill (with a count), so newly added niches appear automatically.
  const displayCategories = useMemo(() => {
    const source = activeTab === "community" ? communityTemplates : allTemplates;
    const counts = new Map<string, number>();
    for (const tpl of source) {
      if (!tpl.category) continue;
      counts.set(tpl.category, (counts.get(tpl.category) || 0) + 1);
    }
    const ids = Array.from(counts.keys()).sort((a, b) =>
      categoryMeta(a).label.localeCompare(categoryMeta(b).label)
    );
    return [
      { id: "all", ...categoryMeta("all"), count: source.length },
      ...ids.map((id) => ({ id, ...categoryMeta(id), count: counts.get(id) || 0 })),
    ];
  }, [activeTab, allTemplates, communityTemplates]);

  const shareCategories = useMemo(() => {
    const ids = new Set(Object.keys(CATEGORY_META).filter((id) => id !== "all"));
    for (const tpl of allTemplates) {
      if (tpl.category) ids.add(tpl.category);
    }
    return Array.from(ids).sort((a, b) =>
      categoryMeta(a).label.localeCompare(categoryMeta(b).label)
    );
  }, [allTemplates]);


  const filteredTemplates = useMemo(() => {
    const source = activeTab === "community" ? communityTemplates : allTemplates;
    return source.filter((tpl) => {
      const matchesCategory = selectedCategory === "all" || tpl.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory, activeTab, allTemplates, communityTemplates]);

  const importMutation = useMutation({
    mutationFn: async (tpl: MarketplaceTemplate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");
      // Bake the user's edited content + image overrides into the imported HTML
      // (only for the template currently open in the preview dialog) and also
      // persist them as structured data so they survive refresh and export.
      const overrides = tpl.id === previewTemplate?.id
        ? { ...contentOverrides, ...imageOverrides }
        : {};
      const hasOverrides = Object.keys(overrides).length > 0;
      // Merge edits over the template's defaults so the saved default values
      // also reflect the customisation (used by the editor + CSV export).
      const mergedDefaults = { ...(tpl.defaultValues ?? {}), ...overrides };
      const content = hasOverrides
        ? applyTemplateDefaults(tpl.content, overrides)
        : tpl.content;
      const { error } = await supabase.from("templates").insert({
        name: tpl.name,
        content,
        variables: tpl.variables,
        user_id: user.id,
        workspace_id: wsId,
        seo_title_pattern: tpl.seo_title_pattern || "",
        seo_description_pattern: tpl.seo_description_pattern || "",
        schema_type: tpl.schema_type || "WebPage",
        schema_config: {
          default_values: mergedDefaults,
          ...(hasOverrides
            ? { content_overrides: contentOverrides, image_overrides: imageOverrides }
            : {}),
        },
      } as any);
      if (error) throw error;
    },
    onSuccess: (_, tpl) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template imported!", description: `"${tpl.name}" added to your templates.` });
      setPreviewTemplate(null);
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  // Share template mutation
  const shareMutation = useMutation({
    mutationFn: async (form: typeof shareForm) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const template = userTemplates.find((t: any) => t.id === form.templateId);
      if (!template) throw new Error("Template not found");
      const { error } = await supabase.from("shared_templates").insert({
        template_id: form.templateId,
        user_id: user.id,
        workspace_id: wsId,
        author_name: form.authorName || "Anonymous",
        description: form.description,
        category: form.category,
        content: (template as any).content,
        variables: (template as any).variables || [],
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-templates"] });
      toast({ title: "Template shared!", description: "Your template is now available in the community marketplace." });
      setShareOpen(false);
      setShareForm({ templateId: "", description: "", category: "general", authorName: "" });
    },
    onError: (err: Error) => {
      toast({ title: "Share failed", description: err.message, variant: "destructive" });
    },
  });

  // Rate template mutation
  const rateMutation = useMutation({
    mutationFn: async ({ sharedId, rating, review }: { sharedId: string; rating: number; review: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("template_ratings").upsert({
        shared_template_id: sharedId,
        user_id: user.id,
        rating,
        review: review || null,
      } as any, { onConflict: "shared_template_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-ratings"] });
      toast({ title: "Rating submitted!" });
    },
    onError: (err: Error) => {
      toast({ title: "Rating failed", description: err.message, variant: "destructive" });
    },
  });

  const categoryIcon = (cat: string) => categoryMeta(cat).label;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            {t("marketplace.title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("marketplace.subtitle")}
          </p>
        </div>
        <Button onClick={() => setShareOpen(true)} variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" /> {t("marketplace.shareTemplate")}
        </Button>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={activeTab === "browse" ? "default" : "outline"}
          onClick={() => setActiveTab("browse")}
        >
          <Store className="h-3.5 w-3.5 mr-1.5" /> {t("marketplace.allTemplates")}
        </Button>
        <Button
          size="sm"
          variant={activeTab === "community" ? "default" : "outline"}
          onClick={() => setActiveTab("community")}
        >
          <Users className="h-3.5 w-3.5 mr-1.5" /> {t("marketplace.communityShared")}
          {communityTemplates.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-[10px]">{communityTemplates.length}</Badge>
          )}
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("marketplace.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {displayCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">{cat.count}</Badge>
            {cat.id === "prestashop" && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-amber-500/10 text-amber-500 border-amber-500/20">Soon</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tpl) => (
          <Card
            key={tpl.id}
            className="shadow-surface hover:shadow-surface-hover transition-all duration-150 cursor-pointer group"
            onClick={() => setPreviewTemplate(tpl)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  {tpl.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {tpl.downloads.toLocaleString()}
                </span>
                <Badge variant="outline" className="text-[10px] capitalize">{categoryIcon(tpl.category)}</Badge>
              </div>


              <div className="border border-border rounded-md overflow-hidden bg-muted/30 h-32">
                <div
                  className="transform scale-[0.25] origin-top-left w-[400%] h-[400%] pointer-events-none"
                  dangerouslySetInnerHTML={{ __html: applyTemplateDefaults(tpl.content, tpl.defaultValues) }}
                />
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {tpl.variables.length} variables
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportTemplateZip(tpl);
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" /> Export
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      importMutation.mutate(tpl);
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" /> Import
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Store className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No templates found</p>
            <p className="text-sm mt-1">Try a different search or category.</p>
          </div>
        )}
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(v) => !v && setPreviewTemplate(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {activePreview.name}
                  {previewTranslating && (
                    <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                      <Languages className="h-3.5 w-3.5 animate-pulse" /> {t("common.translating") || "Translating…"}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">{activePreview.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    {activePreview.rating}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Download className="h-3.5 w-3.5" />
                    {activePreview.downloads.toLocaleString()} imports
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {activePreview.author}
                  </span>
                  <Badge variant="outline" className="capitalize">{categoryIcon(activePreview.category)}</Badge>
                  {activePreview.schema_type && (
                    <Badge variant="secondary" className="text-xs">Schema: {activePreview.schema_type}</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs text-muted-foreground">Variables:</span>
                  {activePreview.variables.map((v) => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                  ))}
                </div>

                <SeoDefaultsEditor template={activePreview} />


                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="preview" className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </TabsTrigger>
                    <TabsTrigger value="customize" className="flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5" /> Customize
                    </TabsTrigger>
                    <TabsTrigger value="code" className="flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5" /> Code
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview" className="mt-3">
                    <TemplatePreview html={applyTemplateDefaults(activePreview.content, activePreview.defaultValues)} />
                  </TabsContent>
                  <TabsContent value="customize" className="mt-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                      <span className="text-xs text-muted-foreground mr-auto">
                        Map your data: download the starter CSV (one column per variable), fill it in, then upload to auto-populate every section.
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => downloadStarterCsv({
                          templateName: activePreview.name,
                          variables: activePreview.variables,
                          defaultValues: activePreview.defaultValues,
                        })}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" /> Starter CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => exportTemplateZip(activePreview)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" /> Export design (.zip)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => document.getElementById("mkt-csv-upload")?.click()}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload CSV
                      </Button>
                      {uploadedCsv.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setUploadedCsv([])}>
                          Clear ({uploadedCsv.length})
                        </Button>
                      )}
                      <input
                        id="mkt-csv-upload"
                        type="file"
                        accept=".csv,.tsv,.txt,.json,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleCsvUpload(f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                    {uploadedCsv.length > 0 && (
                      <RowMappingPreview csvData={uploadedCsv} templateContent={activePreview.content} />
                    )}
                    <ContentFieldsPanel
                      templateContent={activePreview.content}
                      defaultValues={activePreview.defaultValues}
                      values={contentOverrides}
                      onChange={(v, val) => setContentOverrides((prev) => ({ ...prev, [v]: val }))}
                      onReset={() => setContentOverrides({})}
                    />
                    <ImageVariablePanel
                      templateContent={activePreview.content}
                      defaultValues={activePreview.defaultValues}
                      values={imageOverrides}
                      onChange={(v, url) => setImageOverrides((prev) => ({ ...prev, [v]: url }))}
                      onReset={() => setImageOverrides({})}
                    />
                    <LiveVariablePreview
                      templateContent={activePreview.content}
                      csvData={previewRows}
                    />
                  </TabsContent>
                  <TabsContent value="code" className="mt-3">
                    <pre className="p-4 bg-muted rounded-md text-xs font-mono overflow-x-auto leading-relaxed max-h-64 overflow-y-auto">
                      {activePreview.content}
                    </pre>
                  </TabsContent>
                </Tabs>


                {/* Rating section for shared templates */}
                {previewTemplate.isShared && previewTemplate.shared_id && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <h4 className="text-xs font-semibold flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" /> Rate this template
                    </h4>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            onClick={() => setRatingValue(s)}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`h-5 w-5 transition-colors ${
                                s <= ratingValue ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder="Optional review..."
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={rateMutation.isPending}
                        onClick={() => rateMutation.mutate({
                          sharedId: previewTemplate.shared_id!,
                          rating: ratingValue,
                          review: reviewText,
                        })}
                      >
                        {rateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit"}
                      </Button>
                    </div>
                    {previewTemplate.ratingCount !== undefined && previewTemplate.ratingCount > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {previewTemplate.ratingCount} rating{previewTemplate.ratingCount !== 1 ? "s" : ""} · avg {previewTemplate.rating}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
                  <Button
                    onClick={() => importMutation.mutate(activePreview)}
                    disabled={importMutation.isPending || previewTranslating}
                  >
                    {importMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
                    ) : (
                      <><Download className="mr-2 h-4 w-4" /> Import to My Templates</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" /> Share Your Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template to Share</Label>
              <Select value={shareForm.templateId} onValueChange={(v) => setShareForm(f => ({ ...f, templateId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                <SelectContent>
                  {userTemplates.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input
                placeholder="Your name or alias"
                value={shareForm.authorName}
                onChange={(e) => setShareForm(f => ({ ...f, authorName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this template is for..."
                value={shareForm.description}
                onChange={(e) => setShareForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={shareForm.category} onValueChange={(v) => setShareForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {shareCategories.map((id) => (
                      <SelectItem key={id} value={id}>
                        <span className="flex items-center gap-2">
                          {categoryMeta(id).label}
                          {id === "prestashop" && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-amber-500/10 text-amber-500 border-amber-500/20">Soon</Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShareOpen(false)}>Cancel</Button>
              <Button
                disabled={!shareForm.templateId || !shareForm.description || shareMutation.isPending}
                onClick={() => shareMutation.mutate(shareForm)}
              >
                {shareMutation.isPending ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sharing...</>
                ) : (
                  <><Share2 className="mr-1.5 h-3.5 w-3.5" /> Share to Marketplace</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
