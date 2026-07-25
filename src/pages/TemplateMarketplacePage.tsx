import { useState, useMemo, useEffect } from "react";
import { normalizeTemplateHtml } from "@/lib/template-normalizer";
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
  Heart, Loader2, Share2, MessageSquare, SlidersHorizontal, ChevronDown, ShieldCheck,
  RefreshCw, Wrench,
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
import { TemplateWordPressTestDialog } from "@/components/templates/TemplateWordPressTestDialog";
import { downloadStarterCsv } from "@/lib/csv-starter";
import { exportTemplateZip } from "@/lib/template-export";
import { parseUploadedFile } from "@/lib/export-csv";
import { HTML_ONLY_MODE } from "@/lib/publish-format";
import { COMMUNITY_TEMPLATES, applyTemplateDefaults, reskinContent, defaultSkinVariant, type MarketplaceTemplate, type TemplateFormat, type TemplatePlatform } from "@/lib/marketplace-templates";

import { useTranslatedTemplate } from "@/hooks/use-translated-template";
import { useTranslatedTemplateList } from "@/hooks/use-translated-template-list";
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
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 15;
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedFormat, setSelectedFormat] = useState<"all" | "elementor" | "shopify" | "html">("all");
  const [previewTemplate, setPreviewTemplate] = useState<MarketplaceTemplate | null>(null);
  const [wpTestOpen, setWpTestOpen] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [uploadedCsv, setUploadedCsv] = useState<Record<string, string>[]>([]);
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [contentOverrides, setContentOverrides] = useState<Record<string, string>>({});
  // Top-level format split: Elementor (WordPress), Shopify, or raw HTML/CSS.
  // Every marketplace template is available in all three formats — Elementor and
  // Shopify variants are re-skinned to match the target platform, while HTML/CSS
  // returns the raw template markup so the client can grab whichever chunk they
  // need for their own stack.
  const [platformChoice, setPlatformChoice] = useState<"elementor" | "shopify" | "html">(HTML_ONLY_MODE ? "html" : "elementor");
  // Auto-run "AI Add Variables" right after a marketplace template is imported,
  // so users don't have to open the editor and click the button manually.
  const [autoAddVars, setAutoAddVars] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem("marketplace.autoAddVars");
    return v === null ? true : v === "1";
  });
  useEffect(() => {
    try { window.localStorage.setItem("marketplace.autoAddVars", autoAddVars ? "1" : "0"); } catch {}
  }, [autoAddVars]);
  const skinPlatform: TemplatePlatform =
    platformChoice === "shopify" ? "shopify" : platformChoice === "html" ? "generic" : "wordpress";
  const convertForPlatform = (content: string) =>
    reskinContent(content, skinPlatform, skinPlatform === "generic" ? undefined : defaultSkinVariant(skinPlatform));
  // v1 keeps everything as real HTML/CSS so published pages match the preview 1:1.
  const resolveFormat = (_tpl: MarketplaceTemplate): TemplateFormat | "html" =>
    HTML_ONLY_MODE ? "html" : platformChoice === "shopify" ? "shopify" : platformChoice === "html" ? "gutenberg" : "elementor";
  const formatLabel =
    platformChoice === "shopify" ? "Shopify" : platformChoice === "html" ? "HTML / CSS" : "Elementor";
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  // Auto-translate the previewed template (content, name, SEO + default values)
  // into the active language (en/fr/de/es). English is returned untouched.
  const { template: activePreview, translating: previewTranslating, error: translateError } =
    useTranslatedTemplate(previewTemplate, language);

  // Surface translation failures so the user knows the preview fell back to English.
  useEffect(() => {
    if (translateError) {
      toast({
        title: "Translation unavailable",
        description: `${translateError}. Showing the original English template.`,
        variant: "destructive",
      });
    }
  }, [translateError, toast]);

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


  // Fetch admin-imported Elementor marketplace templates
  const { data: adminTemplates = [] } = useQuery({
    queryKey: ["marketplace-admin-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch conversion status from the elementor_templates catalog so each card
  // can show whether the template has been pre-converted into Elementor JSON
  // and Shopify section JSON at seed/backfill time. HTML/CSS is always ready
  // because the raw markup lives on the template itself.
  const { data: conversionRows = [] } = useQuery({
    queryKey: ["marketplace-conversion-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elementor_templates")
        .select("source_template_id, elementor_json, shopify_section_json, status, updated_at, created_at");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Details modal: shows exact error + timestamp for a clicked conversion chip.
  const [detailsCtx, setDetailsCtx] = useState<{
    tpl: MarketplaceTemplate;
    platform: "elementor" | "shopify" | "html";
    state: "ready" | "failed" | "pending";
  } | null>(null);

  const { data: detailsHistory = [], isLoading: detailsLoading } = useQuery({
    queryKey: ["conversion-details", detailsCtx?.tpl.id, detailsCtx?.platform],
    enabled: !!detailsCtx && detailsCtx.platform !== "html",
    queryFn: async () => {
      const tpl = detailsCtx!.tpl;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tpl.id);
      // Resolve marketplace slug -> real templates.id(s) via source_marketplace_id.
      const templateIds = new Set<string>();
      if (isUuid) templateIds.add(tpl.id);
      const { data: matched } = await supabase
        .from("templates")
        .select("id")
        .eq("source_marketplace_id", tpl.id);
      for (const r of matched ?? []) templateIds.add((r as any).id);
      if (templateIds.size === 0) return [];
      const { data, error } = await supabase
        .from("template_backfill_items")
        .select("id, status, error, attempts, run_id, created_at, template_name, widgets, fields")
        .in("template_id", Array.from(templateIds))
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const runIds = Array.from(new Set((data ?? []).map((r: any) => r.run_id).filter(Boolean)));
      let runMap = new Map<string, any>();
      if (runIds.length) {
        const { data: runs } = await supabase
          .from("template_backfill_runs")
          .select("id, trigger_source, status, started_by")
          .in("id", runIds);
        for (const r of runs ?? []) runMap.set((r as any).id, r);
      }
      return (data ?? []).map((r: any) => ({ ...r, run: runMap.get(r.run_id) ?? null }));
    },
  });


  const conversionMap = useMemo(() => {
    const m = new Map<string, { elementor: "ready" | "failed"; shopify: "ready" | "failed"; updatedAt: string | null }>();
    for (const r of conversionRows as any[]) {
      const elJson = r.elementor_json;
      const shJson = r.shopify_section_json;
      const elReady = Array.isArray(elJson) ? elJson.length > 0 : !!elJson;
      const shReady = shJson && typeof shJson === "object"
        ? !!(shJson.sectionLiquid || shJson.template)
        : false;
      const failed = r.status === "failed";
      m.set(r.source_template_id, {
        elementor: failed ? "failed" : elReady ? "ready" : "failed",
        shopify: failed ? "failed" : shReady ? "ready" : "failed",
        updatedAt: r.updated_at || r.created_at || null,
      });
    }
    return m;
  }, [conversionRows]);

  type ConvState = "ready" | "failed" | "pending";
  function getConversionStatus(tpl: MarketplaceTemplate): { elementor: ConvState; shopify: ConvState; html: ConvState; updatedAt: string | null } {
    const hit = conversionMap.get(tpl.id) || conversionMap.get((tpl as any).source_marketplace_id);
    return {
      elementor: hit ? hit.elementor : "pending",
      shopify: hit ? hit.shopify : "pending",
      html: tpl.content && tpl.content.length > 0 ? "ready" : "failed",
      updatedAt: hit?.updatedAt ?? null,
    };
  }


  // Per-template retry: reruns the widget-engine conversion for a single
  // marketplace template. Uses the sync-template-engine edge function which
  // records a run in template_backfill_runs so admins can inspect progress in
  // the Template Sync job runner. Tracks the in-flight template id so we can
  // show a spinner on the specific card that's converting.
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const retryConversionMutation = useMutation({
    mutationFn: async (tpl: MarketplaceTemplate) => {
      setRetryingId(tpl.id);
      // Marketplace ids are slugs (e.g. "seo-landing"), not UUIDs — send them
      // only as source_marketplace_ids so the edge function can match on
      // templates.source_marketplace_id without a UUID cast error.
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tpl.id);
      const { data, error } = await supabase.functions.invoke("sync-template-engine", {
        body: {
          source_marketplace_ids: [tpl.id],
          ...(isUuid ? { template_ids: [tpl.id] } : {}),
          trigger_source: "marketplace-card",
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any, tpl) => {
      const converted = data?.converted ?? 0;
      const failed = data?.failed ?? 0;
      queryClient.invalidateQueries({ queryKey: ["marketplace-conversion-status"] });
      queryClient.invalidateQueries({ queryKey: ["conversion-details"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-templates"] });
      if (failed > 0 && converted === 0) {
        toast({
          title: "Retry failed",
          description: `Conversion did not succeed for "${tpl.name}". Please try again.`,
          variant: "destructive",
        });
      } else if (converted === 0 && failed === 0) {
        toast({
          title: "Nothing to convert",
          description: `"${tpl.name}" isn't imported yet. Click Import to add it, then retry.`,
        });
      } else {
        toast({ title: "Conversion re-run", description: `"${tpl.name}" reconverted successfully.` });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    },
    onSettled: () => setRetryingId(null),
  });


  const importedTemplates: MarketplaceTemplate[] = useMemo(() => {
    return (adminTemplates as any[]).map((at) => ({
      id: at.id,
      name: at.name,
      description: at.description || "",
      content: at.preview_html || "",
      variables: at.variables || [],
      category: at.category || "business",
      tags: [],
      author: "Marketplace",
      downloads: 0,
      rating: 0,
      defaultValues: at.default_values || {},
      sourceUrl: at.source_url || undefined,
    }));
  }, [adminTemplates]);



  const allTemplates = useMemo(() => {
    return [...importedTemplates, ...COMMUNITY_TEMPLATES];
  }, [importedTemplates]);

  // Build the category pill list dynamically from whatever templates exist on
  // the active tab. "All" is always first; every category present in the data
  // gets a pill (with a count), so newly added niches appear automatically.



  const displayCategories = useMemo(() => {
    const source = allTemplates;
    const counts = new Map<string, number>();
    for (const tpl of source) {
      // Group the literal platform categories under their real content type so
      // the pills only describe the niche/category, not the platform (the
      // platform is now chosen with the top-level Elementor/Shopify switch).
      const cat = tpl.category && tpl.category !== "wordpress" && tpl.category !== "shopify"
        ? tpl.category
        : "general";
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    const ids = Array.from(counts.keys()).sort((a, b) =>
      localizedCategoryLabel(a, language).localeCompare(localizedCategoryLabel(b, language))
    );
    return [
      { id: "all", ...categoryMeta("all"), label: localizedCategoryLabel("all", language), count: source.length },
      ...ids.map((id) => ({ id, ...categoryMeta(id), label: localizedCategoryLabel(id, language), count: counts.get(id) || 0 })),
    ];
  }, [allTemplates, language]);



  // Unique tags across the active tab's templates (for the tag filter dropdown).
  const availableTags = useMemo(() => {
    const source = allTemplates;
    const counts = new Map<string, number>();
    for (const tpl of source) {
      for (const tag of tpl.tags || []) {
        const t = String(tag).toLowerCase().trim();
        if (!t) continue;
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allTemplates]);

  // Native format for a template — used by the format filter.
  const nativeFormat = (tpl: MarketplaceTemplate): "elementor" | "shopify" | "html" => {
    if (tpl.platform === "shopify" || tpl.category === "shopify") return "shopify";
    if (tpl.platform === "generic") return "html";
    return "elementor";
  };

  const filteredTemplates = useMemo(() => {
    const source = allTemplates;
    const q = searchQuery.toLowerCase();
    return source.filter((tpl) => {
      const cat = tpl.category && tpl.category !== "wordpress" && tpl.category !== "shopify"
        ? tpl.category
        : "general";
      const matchesCategory = selectedCategory === "all" || cat === selectedCategory;
      const matchesTag =
        selectedTag === "all" ||
        (tpl.tags || []).some((t) => String(t).toLowerCase() === selectedTag);
      const matchesFormat = selectedFormat === "all" || nativeFormat(tpl) === selectedFormat;
      const matchesSearch =
        !q ||
        (tpl.name || "").toLowerCase().includes(q) ||
        (tpl.description || "").toLowerCase().includes(q);
      return matchesCategory && matchesTag && matchesFormat && matchesSearch;
    });
  }, [searchQuery, selectedCategory, selectedTag, selectedFormat, allTemplates]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedTag, selectedFormat, platformChoice]);

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PER_PAGE));
  const paginatedTemplates = useMemo(
    () => filteredTemplates.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE),
    [filteredTemplates, currentPage]
  );

  // Auto-translate the card metadata (name + description) for the visible
  // templates into the active language (en/fr/de/es). Cached per template.
  const { localize: localizeCard } = useTranslatedTemplateList(paginatedTemplates, language);

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
      // Bake the template's default values (plus any user overrides) into the
      // imported HTML so the saved template shows real content instead of raw
      // {variable} placeholders.
      const baked = Object.keys(mergedDefaults).length > 0
        ? applyTemplateDefaults(tpl.content, mergedDefaults)
        : tpl.content;
      // Re-skin the HTML to match the chosen platform (Elementor/WordPress vs Shopify)
      // so the imported template looks native to the target platform.
      // Normalize marketplace HTML into the shared HTML/CSS/JS structure so it
      // saves and publishes exactly like imported / URL-scanned templates.
      const platformContent = convertForPlatform(baked);
      const content = normalizeTemplateHtml(platformContent).html || platformContent;
      const { data: inserted, error } = await supabase.from("templates").insert({
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
          publish_format: resolveFormat(tpl),
          ...(hasOverrides
            ? { content_overrides: contentOverrides, image_overrides: imageOverrides }
            : {}),
        },
      } as any).select("id, content").single();
      if (error) throw error;
      return { tpl, insertedId: (inserted as any)?.id as string | undefined, insertedContent: (inserted as any)?.content as string | undefined };
    },
    onSuccess: async (result, tpl) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template imported!", description: `"${tpl.name}" added to your templates.` });
      setPreviewTemplate(null);
      if (platformChoice === "elementor" || platformChoice === "shopify") {
        void supabase.functions.invoke("backfill-elementor-catalog", { body: { force: true } }).catch(() => {});
      }
      // Auto-run "AI Add Variables" so the freshly imported template already
      // has SEO-friendly {snake_case} placeholders — no manual editor step.
      const insertedContent = result?.insertedContent || "";
      const insertedId = result?.insertedId;
      const existingVars = new Set((insertedContent.match(/\{([a-z_]+)\}/gi) || []));
      if (autoAddVars && insertedId && insertedContent && existingVars.size < 3) {
        toast({ title: "✨ Adding variables…", description: "AI is inserting SEO placeholders into your new template." });
        try {
          const { data, error: aiErr } = await supabase.functions.invoke("generate-template", {
            body: {
              mode: "improve",
              existingContent: insertedContent,
              instruction:
                "Rewrite this HTML to be a REUSABLE SEO template. Replace repeated concrete nouns with {snake_case} placeholders using EXACTLY this vocabulary when they fit: {service}, {service_name}, {city}, {state}, {country}, {business_name}, {phone}, {email}, {address}, {price}, {year}, {quality}, {benefit}, {keyword}. " +
                "Rules: (1) keep the EXACT same HTML tags, classes, ids, inline styles and image URLs — do NOT change design or layout. (2) only swap visible text words and alt attributes. (3) do not add new sections or copy. (4) use each variable at least twice where natural for maximum SEO reach. (5) return ONLY the final HTML, no explanations.",
            },
          });
          if (aiErr) throw aiErr;
          const out = ((data as any)?.content || "").replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
          if (!out) throw new Error("AI returned no HTML");
          const foundVars = [...new Set((out.match(/\{([a-z_]+)\}/gi) || []))].map((v) => String(v).replace(/[{}]/g, ""));
          const { error: updErr } = await supabase
            .from("templates")
            .update({ content: out, variables: foundVars })
            .eq("id", insertedId);
          if (updErr) throw updErr;
          queryClient.invalidateQueries({ queryKey: ["templates"] });
          toast({ title: "✨ Variables added!", description: `${foundVars.length} placeholder(s) inserted automatically.` });
        } catch (e: any) {
          toast({
            title: "Auto-add skipped",
            description: e?.message || "Open the template and click 'AI Add Variables' to insert placeholders.",
            variant: "destructive",
          });
        }
      }
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });



  const categoryIcon = (cat: string) => localizedCategoryLabel(cat, language);


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
      </div>

      {/* Step 1 — choose the target platform. Hidden in HTML-only (v1) mode. */}
      <div className={HTML_ONLY_MODE ? "hidden" : ""}>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Choose your format</p>
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl ${HTML_ONLY_MODE ? "hidden" : ""}`}>
          {([
            { id: "elementor" as const, label: "Elementor", desc: "WordPress / Elementor JSON", icon: FileText },
            { id: "shopify" as const, label: "Shopify", desc: "Shopify section / Liquid", icon: ShoppingBag },
            { id: "html" as const, label: "HTML / CSS", desc: "Raw HTML + CSS markup", icon: Code },
          ]).map((p) => {
            const active = platformChoice === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatformChoice(p.id)}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  active ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <p.icon className={`h-6 w-6 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground">{p.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        {/* Auto AI Add Variables toggle — runs the same "AI Add Variables" pass
            used inside the template editor immediately after a marketplace
            import, so users don't have to open the editor manually. */}
        <label className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs cursor-pointer select-none hover:bg-muted/50 transition-colors">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={autoAddVars}
            onChange={(e) => setAutoAddVars(e.target.checked)}
          />
          <span className="font-medium">Auto-run “AI Add Variables” after import</span>
          <span className="text-muted-foreground hidden sm:inline">— inserts SEO {"{placeholders}"} automatically</span>
        </label>
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
        <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as typeof selectedFormat)}>
          <SelectTrigger className={`w-full sm:w-[180px] ${HTML_ONLY_MODE ? "hidden" : ""}`}>
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All formats</SelectItem>
            {!HTML_ONLY_MODE && <SelectItem value="elementor">Elementor</SelectItem>}
            {!HTML_ONLY_MODE && <SelectItem value="shopify">Shopify</SelectItem>}
            <SelectItem value="html">HTML / CSS</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            <SelectItem value="all">All tags</SelectItem>
            {availableTags.map(([tag, count]) => (
              <SelectItem key={tag} value={tag} className="capitalize">
                {tag} <span className="text-muted-foreground ml-1">({count})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        {paginatedTemplates.map((tpl) => (
          <Card
            key={tpl.id}
            className="shadow-surface hover:shadow-surface-hover transition-all duration-150 cursor-pointer group"
            onClick={() => setPreviewTemplate(tpl)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{localizeCard(tpl).name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{localizeCard(tpl).description}</p>
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
                  dangerouslySetInnerHTML={{ __html: convertForPlatform(applyTemplateDefaults(tpl.content, tpl.defaultValues)) }}
                />
              </div>

              {(() => {
                const conv = getConversionStatus(tpl);
                const chip = (label: string, state: ConvState, active: boolean, platform: "elementor" | "shopify" | "html") => {
                  const cls =
                    state === "ready"
                      ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                      : state === "failed"
                      ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                      : "bg-amber-500/15 text-amber-500 border-amber-500/30";
                  const dot =
                    state === "ready" ? "bg-emerald-500" : state === "failed" ? "bg-rose-500" : "bg-amber-500";
                  const title = `${label}: click for details`;
                  return (
                    <button
                      type="button"
                      title={title}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailsCtx({ tpl, platform, state });
                      }}
                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium hover:opacity-100 transition ${cls} ${active ? "ring-1 ring-current/40" : "opacity-80"}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                      {label}
                    </button>
                  );
                };
                const isRetrying = retryingId === tpl.id;
                return (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {HTML_ONLY_MODE ? "Output format" : "Conversion status"}
                      </span>
                      <div className="flex items-center gap-1">
                        {!HTML_ONLY_MODE && <Badge variant="secondary" className="text-[9px]">{formatLabel}</Badge>}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1.5 text-[9px] gap-1"
                          title={isRetrying ? "Rebuilding…" : HTML_ONLY_MODE ? "Rebuild the HTML/CSS bundle for this template" : "Rerun Elementor + Shopify conversion for this template"}
                          disabled={isRetrying}
                          aria-busy={isRetrying}
                          onClick={(e) => {
                            e.stopPropagation();
                            retryConversionMutation.mutate(tpl);
                          }}
                        >
                          {isRetrying ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Converting…</>
                          ) : (
                            <><RefreshCw className="h-3 w-3" /> Retry</>
                          )}
                        </Button>
                      </div>
                    </div>
                    {isRetrying && (
                      <div className="mb-2 space-y-1" role="status" aria-live="polite">
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full w-1/3 animate-progress-indeterminate bg-primary" />
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          {HTML_ONLY_MODE ? "Rebuilding the HTML/CSS bundle… status refreshes when complete." : "Rebuilding Elementor + Shopify kits… chips refresh when complete."}
                        </p>
                      </div>
                    )}
                    <div className={`flex flex-wrap items-center gap-1 ${isRetrying ? "opacity-60" : ""}`}>
                      {!HTML_ONLY_MODE && chip("Elementor", conv.elementor, platformChoice === "elementor", "elementor")}
                      {!HTML_ONLY_MODE && chip("Shopify", conv.shopify, platformChoice === "shopify", "shopify")}
                      {chip("HTML / CSS", conv.html, platformChoice === "html", "html")}
                    </div>
                  </div>
                );
              })()}


              <div className="flex items-center justify-between mt-3">
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

      {filteredTemplates.length > PER_PAGE && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
            <span className="mx-2 opacity-50">·</span>
            {filteredTemplates.length} {filteredTemplates.length === 1 ? "result" : "results"}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

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

                <div className="rounded-lg border border-border bg-muted/20">
                  <button
                    type="button"
                    onClick={() => setVariablesOpen((o) => !o)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${variablesOpen ? "" : "-rotate-90"}`}
                    />
                    <span className="font-medium">Variables</span>
                    <Badge variant="secondary" className="text-[10px]">{activePreview.variables.length}</Badge>
                  </button>
                  {variablesOpen && (
                    <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                      {activePreview.variables.map((v) => (
                        <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                      ))}
                    </div>
                  )}
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
                    <TemplatePreview html={convertForPlatform(applyTemplateDefaults(activePreview.content, activePreview.defaultValues))} />
                  </TabsContent>
                  <TabsContent value="customize" className="mt-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                      <span className="text-xs text-muted-foreground mr-auto">
                        Map your data: download the starter file (one column per variable, pre-filled with a real example row), edit it, then upload to auto-populate every section.
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => downloadStarterCsv({
                          templateName: activePreview.name,
                          variables: activePreview.variables,
                          defaultValues: activePreview.defaultValues,
                          format: "xlsx",
                        })}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" /> Starter Excel
                      </Button>
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
                      {convertForPlatform(activePreview.content)}
                    </pre>

                  </TabsContent>
                </Tabs>



                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border mt-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium">Publish format</span>
                    <Badge variant="secondary" className="w-fit">
                      {formatLabel}
                    </Badge>
                  </div>
                </div>


                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
                  {platformChoice === "elementor" && (
                    <Button variant="secondary" onClick={() => setWpTestOpen(true)}>
                      <ShieldCheck className="mr-2 h-4 w-4" /> Test on WordPress
                    </Button>
                  )}
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

      {/* Conversion details modal */}
      <Dialog open={!!detailsCtx} onOpenChange={(v) => !v && setDetailsCtx(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  detailsCtx?.state === "ready"
                    ? "bg-emerald-500"
                    : detailsCtx?.state === "failed"
                    ? "bg-rose-500"
                    : "bg-amber-500"
                }`}
              />
              {detailsCtx?.platform === "elementor"
                ? "Elementor"
                : detailsCtx?.platform === "shopify"
                ? "Shopify"
                : "HTML / CSS"}{" "}
              conversion — {detailsCtx?.tpl.name}
            </DialogTitle>
          </DialogHeader>
          {detailsCtx && (() => {
            const conv = getConversionStatus(detailsCtx.tpl);
            const stateLabel =
              detailsCtx.state === "ready"
                ? "Ready to publish"
                : detailsCtx.state === "failed"
                ? "Conversion failed"
                : "Pending — converts on import";
            const fmtDate = (iso: string | null) => {
              if (!iso) return "—";
              try {
                return new Date(iso).toLocaleString();
              } catch {
                return iso;
              }
            };
            const history: any[] = detailsHistory as any[];
            
            const dotFor = (s: string) =>
              s === "success" ? "bg-emerald-500" : s === "failed" ? "bg-rose-500" : s === "skipped" ? "bg-muted-foreground" : "bg-amber-500";
            return (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-muted-foreground">State</div>
                  <div className="col-span-2 font-medium">{stateLabel}</div>
                  <div className="text-muted-foreground">Last conversion</div>
                  <div className="col-span-2">{fmtDate(conv.updatedAt)}</div>
                  {detailsCtx.platform !== "html" && (
                    <>
                      <div className="text-muted-foreground">Total attempts</div>
                      <div className="col-span-2">{history.length}</div>
                    </>
                  )}
                </div>

                {detailsCtx.platform !== "html" && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      Conversion history
                    </div>
                    {detailsLoading ? (
                      <p className="text-xs text-muted-foreground">Loading timeline…</p>
                    ) : history.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No conversion attempts recorded yet.</p>
                    ) : (
                      <ol className="relative border-l border-border pl-4 space-y-3 max-h-72 overflow-auto pr-1">
                        {history.map((h: any) => (
                          <li key={h.id} className="relative">
                            <span
                              className={`absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background ${dotFor(h.status)}`}
                            />
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-medium capitalize">{h.status}</div>
                              <div className="text-[10px] text-muted-foreground">{fmtDate(h.created_at)}</div>
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                              <span>Attempts: {h.attempts ?? 0}</span>
                              {typeof h.widgets === "number" && <span>Widgets: {h.widgets}</span>}
                              {typeof h.fields === "number" && <span>Fields: {h.fields}</span>}
                              {h.run?.trigger_source && <span>Trigger: {h.run.trigger_source}</span>}
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground font-mono break-all">
                              run: {h.run_id}
                            </div>
                            {h.error && (
                              <pre className="mt-1 text-[10px] bg-muted/50 border border-border rounded-md p-2 whitespace-pre-wrap break-words max-h-32 overflow-auto">
                                {h.error}
                              </pre>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {detailsCtx.platform === "html" && (
                  <p className="text-muted-foreground text-xs">
                    HTML / CSS ships the raw template markup with no conversion step, so it's ready
                    whenever the template has content.
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDetailsCtx(null)}>
                    Close
                  </Button>
                  {detailsCtx.platform !== "html" && (
                    <Button
                      onClick={() => {
                        retryConversionMutation.mutate(detailsCtx.tpl);
                      }}
                      disabled={retryingId === detailsCtx.tpl.id}
                    >
                      {retryingId === detailsCtx.tpl.id ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retrying…</>
                      ) : (
                        <><RefreshCw className="mr-2 h-4 w-4" /> Retry conversion</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {activePreview && (
        <TemplateWordPressTestDialog
          open={wpTestOpen}
          onOpenChange={setWpTestOpen}
          templateName={activePreview.name}
          content={convertForPlatform(applyTemplateDefaults(activePreview.content, activePreview.defaultValues))}
        />
      )}

    </div>
  );
}
