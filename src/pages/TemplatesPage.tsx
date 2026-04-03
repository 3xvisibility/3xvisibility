import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { friendlyError } from "@/lib/friendly-errors";
import { useSubscription } from "@/hooks/use-subscription";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Copy, Trash2, Sparkles, Loader2, Code, Eye, LayoutPanelTop, Pencil, Search as SearchIcon, Globe, Braces, Download, Upload, GripVertical, RotateCcw, FileSpreadsheet, Link2, History, Wand2, LayoutGrid, List, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, MoreVertical, Columns } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { calculateContentSeoScore, calculateContentSeaScore, calculateContentGeoScore } from "@/lib/content-seo-score";
import { SeoScoreBadge } from "@/components/SeoScoreBadge";
import {
  TemplateVisualEditor,
  blocksToHtml,
  htmlToBlocks,
  type TemplateBlock,
} from "@/components/templates/TemplateVisualEditor";
import { ElementorEditor } from "@/components/templates/ElementorEditor";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDragReorder } from "@/hooks/use-drag-reorder";
import { useLanguage } from "@/i18n/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TemplateVersionHistory, saveVersion, type TemplateVersion } from "@/components/templates/TemplateVersionHistory";

type Template = Tables<"templates">;

export default function TemplatesPage() {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [blocks, setBlocks] = useState<TemplateBlock[]>([]);
  const [activeEditorTab, setActiveEditorTab] = useState<string>("elementor");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiIncludeHeaderFooter, setAiIncludeHeaderFooter] = useState(false);
  const [aiBusinessType, setAiBusinessType] = useState("");
  const [aiNiche, setAiNiche] = useState("");
  const [aiSections, setAiSections] = useState<string[]>(["hero", "features", "testimonials", "faq", "cta"]);
  const [aiExtraDetails, setAiExtraDetails] = useState("");
  
  const [editingTemplate, setEditingTemplate] = useState<Tables<"templates"> | null>(null);
  // SEO state
  const [seoTitlePattern, setSeoTitlePattern] = useState("");
  const [seoDescriptionPattern, setSeoDescriptionPattern] = useState("");
  const [slugPattern, setSlugPattern] = useState("");
  const [ogTitlePattern, setOgTitlePattern] = useState("");
  const [ogDescriptionPattern, setOgDescriptionPattern] = useState("");
  const [ogImagePattern, setOgImagePattern] = useState("");
  const [twitterCard, setTwitterCard] = useState("summary_large_image");
  const [canonicalUrlPattern, setCanonicalUrlPattern] = useState("");
  // Schema state
  const [schemaType, setSchemaType] = useState("WebPage");
  const [schemaConfig, setSchemaConfig] = useState<Record<string, string>>({});
  // PGP Fields state
  const [excerptPattern, setExcerptPattern] = useState("");
  const [featuredImageSource, setFeaturedImageSource] = useState<string>("none");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredImageAlt, setFeaturedImageAlt] = useState("");
  const [featuredImageFilename, setFeaturedImageFilename] = useState("");
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [taxonomyCategories, setTaxonomyCategories] = useState("");
  const [taxonomyTags, setTaxonomyTags] = useState("");
  const [postType, setPostType] = useState("page");
  const [authorPattern, setAuthorPattern] = useState("");
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [headerCode, setHeaderCode] = useState("");
  const [footerCode, setFooterCode] = useState("");
  // CSV template state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvTemplateText, setCsvTemplateText] = useState("");
  const [csvTemplateName, setCsvTemplateName] = useState("");
  // Connected site template state
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [siteTemplateWebsite, setSiteTemplateWebsite] = useState("");
  const [sitePages, setSitePages] = useState<{ id: string; title: string; slug: string; link: string }[]>([]);
  const [siteLoadingPages, setSiteLoadingPages] = useState(false);
  const [elementorJsonData, setElementorJsonData] = useState<string | undefined>(undefined);
  // AI Content Generator state
  const [aiContentOpen, setAiContentOpen] = useState(false);
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiContentType, setAiContentType] = useState<string>("seo");
  const [aiSeoGenerating, setAiSeoGenerating] = useState(false);
  const [aiAutoFixing, setAiAutoFixing] = useState(false);
  // US14 – Library management state
  const [searchQuery, setSearchQuery] = useState("");
  const [siteTypeFilter, setSiteTypeFilter] = useState("all");
  const [campaignTypeFilter, setCampaignTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [sortColumn, setSortColumn] = useState<"name" | "date" | "campaigns">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { t } = useLanguage();
  const wsId = currentWorkspace?.id;

  const detectedVars = content.match(/\{[^}]+\}/g) || [];

  // Sync blocks → HTML when in visual mode
  const handleBlocksChange = useCallback((newBlocks: TemplateBlock[]) => {
    setBlocks(newBlocks);
    setContent(blocksToHtml(newBlocks));
  }, []);

  // Sync HTML → blocks when switching to visual tab
  const handleTabChange = useCallback((tab: string) => {
    if (tab === "visual" && activeEditorTab !== "visual") {
      setBlocks(htmlToBlocks(content));
    }
    setActiveEditorTab(tab);
  }, [activeEditorTab, content]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
  });

  // Fetch connected websites for "From Site" flow
  const { data: connectedWebsites = [] } = useQuery({
    queryKey: ["tpl-websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("websites")
        .select("id, name, url, type, status")
        .eq("workspace_id", wsId!)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // US14 – Fetch campaigns linked to templates (for "Used in X campaigns" & site type inference)
  const { data: campaignsByTemplate = {} } = useQuery({
    queryKey: ["template-campaigns", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, template_id, campaign_type, campaign_types, website_id, status, created_at")
        .eq("workspace_id", wsId!)
        .not("template_id", "is", null);
      if (error) throw error;
      const map: Record<string, { count: number; campaignTypes: Set<string>; websiteIds: Set<string>; activeCount: number; lastUsedAt: string | null }> = {};
      for (const c of data || []) {
        if (!c.template_id) continue;
        if (!map[c.template_id]) map[c.template_id] = { count: 0, campaignTypes: new Set(), websiteIds: new Set(), activeCount: 0, lastUsedAt: null };
        map[c.template_id].count++;
        if (c.campaign_type) map[c.template_id].campaignTypes.add(c.campaign_type);
        (c.campaign_types || []).forEach((t: string) => map[c.template_id!]!.campaignTypes.add(t));
        if (c.website_id) map[c.template_id].websiteIds.add(c.website_id);
        if (c.status !== "completed" && c.status !== "failed") map[c.template_id].activeCount++;
        if (!map[c.template_id].lastUsedAt || c.created_at > map[c.template_id].lastUsedAt!) map[c.template_id].lastUsedAt = c.created_at;
      }
      return map;
    },
  });

  // Build website type lookup
  const websiteTypeMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const w of connectedWebsites) m[w.id] = w.type;
    return m;
  }, [connectedWebsites]);

  // Derive site types for each template
  const templateSiteTypes = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    for (const [tplId, info] of Object.entries(campaignsByTemplate)) {
      m[tplId] = new Set();
      for (const wid of info.websiteIds) {
        const t = websiteTypeMap[wid];
        if (t) m[tplId].add(t);
      }
    }
    return m;
  }, [campaignsByTemplate, websiteTypeMap]);

  // Count how many times each template has been duplicated (by matching "Name (Copy)" pattern)
  const dupCounts = useMemo(() => {
    const m: Record<string, number> = {};
    const baseNames = new Map<string, string>(); // baseName → original template id
    for (const t of templates) {
      // Normalize: strip trailing " (Copy)", " (Copy) (Copy)", etc.
      const base = t.name.replace(/\s*\(Copy\)\s*/gi, "").trim();
      if (!baseNames.has(base)) baseNames.set(base, t.id);
    }
    for (const t of templates) {
      const base = t.name.replace(/\s*\(Copy\)\s*/gi, "").trim();
      const origId = baseNames.get(base);
      if (origId && origId !== t.id) {
        m[origId] = (m[origId] || 0) + 1;
      }
    }
    return m;
  }, [templates]);

  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = tpl.name.toLowerCase().includes(q);
        const varMatch = (tpl.variables || []).some(v => v.toLowerCase().includes(q));
        if (!nameMatch && !varMatch) return false;
      }
      if (siteTypeFilter !== "all") {
        const types = templateSiteTypes[tpl.id];
        if (!types || !types.has(siteTypeFilter)) return false;
      }
      if (campaignTypeFilter !== "all") {
        const info = campaignsByTemplate[tpl.id];
        if (!info || !info.campaignTypes.has(campaignTypeFilter)) return false;
      }
      return true;
    });
  }, [templates, searchQuery, siteTypeFilter, campaignTypeFilter, templateSiteTypes, campaignsByTemplate]);

  // Reset pagination when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, siteTypeFilter, campaignTypeFilter]);

  const { features } = useSubscription();
  const maxTemplates = features.templates;

  // Sort filtered templates
  const toggleSort = (col: "name" | "date" | "campaigns") => {
    if (sortColumn === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortColumn(col); setSortDir(col === "name" ? "asc" : "desc"); }
  };

  const sortedTemplates = useMemo(() => {
    const arr = [...filteredTemplates];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortColumn === "name") cmp = a.name.localeCompare(b.name);
      else if (sortColumn === "date") cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      else if (sortColumn === "campaigns") cmp = (campaignsByTemplate[a.id]?.count ?? 0) - (campaignsByTemplate[b.id]?.count ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredTemplates, sortColumn, sortDir, campaignsByTemplate]);

  const SortIcon = ({ col }: { col: "name" | "date" | "campaigns" }) => {
    if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const { ordered: orderedTemplates, getDragProps, hasCustomOrder, resetOrder } = useDragReorder(
    sortedTemplates,
    `tpl-order-${wsId}`
  );

  // Create template from CSV headers
  const createFromCsv = async () => {
    if (!csvTemplateText.trim()) return;
    const lines = csvTemplateText.split("\n").filter(l => l.trim());
    if (lines.length === 0) { toast({ title: "Empty CSV", variant: "destructive" }); return; }
    const headers = lines[0].split(",").map(h => h.trim()).filter(Boolean);
    if (headers.length === 0) { toast({ title: "No headers found", variant: "destructive" }); return; }

    const varHtml = headers.map(h => {
      const varName = h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      return `<div class="mb-4">\n  <h3>${h}</h3>\n  <p>{${varName}}</p>\n</div>`;
    }).join("\n");

    const tplName = csvTemplateName || "CSV Template";
    const tplContent = `<div class="template">\n<h1>{${headers[0].toLowerCase().replace(/[^a-z0-9]+/g, "_")}}</h1>\n${varHtml}\n</div>`;

    setName(tplName);
    setContent(tplContent);
    setBlocks(htmlToBlocks(tplContent));
    setCsvDialogOpen(false);
    setCsvTemplateText("");
    setCsvTemplateName("");
    setOpen(true);
    toast({ title: `Template created with ${headers.length} variables from CSV headers` });
  };

  // Load pages from connected site
  const loadSitePages = async (websiteId: string) => {
    setSiteLoadingPages(true);
    setSitePages([]);
    try {
      const { data, error } = await supabase.functions.invoke("scan-template", {
        body: { action: "list-pages", website_id: websiteId },
      });
      if (error) throw error;
      if (data?.pages) setSitePages(data.pages);
      else if (data?.error) throw new Error(friendlyError(data.error));
    } catch (err: any) {
      toast({ title: "Failed to load pages", description: err.message, variant: "destructive" });
    } finally {
      setSiteLoadingPages(false);
    }
  };

  // Import site page as template - try Elementor first, then public scan
  const importSitePage = async (pageUrl: string, pageTitle: string, pageId?: string) => {
    try {
      let elementorData: string | undefined;
      let importedHtml = "";
      let headStyles = "";

      // Try to fetch Elementor data from connected WordPress site
      if (pageId && siteTemplateWebsite) {
        try {
          const { data: elData, error: elError } = await supabase.functions.invoke("scan-template", {
            body: { action: "fetch-elementor", website_id: siteTemplateWebsite, page_id: pageId },
          });
          if (!elError && elData?.success) {
            if (elData.is_elementor && elData.elementor_data) {
              elementorData = typeof elData.elementor_data === "string" 
                ? elData.elementor_data 
                : JSON.stringify(elData.elementor_data);
            }
            importedHtml = elData.content || "";
            headStyles = elData.headStyles || "";
          }
        } catch { /* fall through to public scan */ }
      }

      // Fallback: scan public URL
      if (!importedHtml) {
        const { data, error } = await supabase.functions.invoke("scan-template", {
          body: { url: pageUrl },
        });
        if (error) throw error;
        importedHtml = data?.bodyHtml || "";
        headStyles = data?.headStyles || "";
        if (data?.is_elementor) {
          toast({ title: "Elementor page detected", description: "For best results, connect your WordPress site to import Elementor data directly." });
        }
      }

      if (importedHtml) {
        const fullContent = headStyles 
          ? `<!-- STYLES -->\n${headStyles}\n<!-- /STYLES -->\n${importedHtml}`
          : importedHtml;
        
        setName(pageTitle || "Site Page Template");
        setContent(fullContent);
        setBlocks(htmlToBlocks(importedHtml));
        setElementorJsonData(elementorData);
        setSiteDialogOpen(false);
        setSitePages([]);
        setOpen(true);
        setActiveEditorTab("elementor");
        toast({ 
          title: elementorData ? "Elementor page imported" : "Page imported as template",
          description: elementorData ? "Original Elementor design preserved. Edit with the page builder." : "Edit variables and save.",
        });
      }
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");

      // Enforce max templates limit (-1 = unlimited)
      if (maxTemplates > 0 && templates.length >= maxTemplates) {
        throw new Error(`Your plan allows a maximum of ${maxTemplates} template(s). Please upgrade to add more.`);
      }

      const variables = [...new Set(content.match(/\{[^}]+\}/g) || [])];
      const { error } = await supabase.from("templates").insert({
        name,
        content,
        variables,
        user_id: user.id,
        workspace_id: wsId,
        seo_title_pattern: seoTitlePattern,
        seo_description_pattern: seoDescriptionPattern,
        schema_type: schemaType,
        schema_config: buildSchemaConfig(),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template created", description: `"${name}" has been saved.` });
      resetAndClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingTemplate) throw new Error("No template to update");
      // Save current version before overwriting
      saveVersion(editingTemplate.id, {
        name: editingTemplate.name,
        content: editingTemplate.content,
        variables: editingTemplate.variables || [],
        seo_title_pattern: (editingTemplate as any).seo_title_pattern || "",
        seo_description_pattern: (editingTemplate as any).seo_description_pattern || "",
      });
      const variables = [...new Set(content.match(/\{[^}]+\}/g) || [])];
      const { error } = await supabase.from("templates").update({
        name,
        content,
        variables,
        seo_title_pattern: seoTitlePattern,
        seo_description_pattern: seoDescriptionPattern,
        schema_type: schemaType,
        schema_config: buildSchemaConfig(),
      } as any).eq("id", editingTemplate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template updated", description: `"${name}" has been saved.` });
      resetAndClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: { prompt, includeHeaderFooter: aiIncludeHeaderFooter },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { content: string; variables: string[]; suggestedName: string };
    },
    onSuccess: (data) => {
      setContent(data.content);
      setName(data.suggestedName);
      toast({ title: "Template generated", description: "Review and save the AI-generated template." });
    },
    onError: (err: Error) => {
      toast({ title: "AI generation failed", description: err.message, variant: "destructive" });
    },
  });

  const aiContentMutation = useMutation({
    mutationFn: async ({ keywords, contentType }: { keywords: string; contentType: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-seo-content", {
        body: { keywords: keywords.split(",").map(k => k.trim()).filter(Boolean), contentType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { content: string; variables: string[]; seoTitle: string; seoDescription: string; suggestedName: string };
    },
    onSuccess: (data) => {
      setContent(data.content);
      setBlocks(htmlToBlocks(data.content));
      setName(data.suggestedName);
      setSeoTitlePattern(data.seoTitle);
      setSeoDescriptionPattern(data.seoDescription);
      setAiContentOpen(false);
      setOpen(true);
      toast({ title: "AI Content generated!", description: "High-scoring SEO/SEA/GEO content is ready. Review and save." });
    },
    onError: (err: Error) => {
      toast({ title: "AI content generation failed", description: err.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (tpl: Template) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");
      const { error } = await supabase.from("templates").insert({
        name: `${tpl.name} (Copy)`,
        content: tpl.content,
        variables: tpl.variables,
        user_id: user.id,
        workspace_id: wsId,
        seo_title_pattern: (tpl as any).seo_title_pattern || "",
        seo_description_pattern: (tpl as any).seo_description_pattern || "",
        schema_type: (tpl as any).schema_type || "WebPage",
        schema_config: (tpl as any).schema_config || {},
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template duplicated", description: "All settings including SEO patterns and schema have been copied." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; linkedCampaigns: { id: string; name: string }[] } | null>(null);

  const checkAndDelete = async (id: string) => {
    const { data: linked } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("template_id", id)
      .limit(10);
    setDeleteTarget({ id, linkedCampaigns: linked ?? [] });
  };

  const performDelete = async (id: string, force: boolean) => {
    try {
      if (force) {
        const { error: unlinkErr } = await supabase
          .from("campaigns")
          .update({ template_id: null })
          .eq("template_id", id);
        if (unlinkErr) throw unlinkErr;
      }
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Template deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === orderedTemplates.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(orderedTemplates.map(t => t.id)));
  };
  const bulkExport = () => {
    const selected = templates.filter(t => selectedIds.has(t.id));
    selected.forEach(tpl => exportTemplate(tpl));
    toast({ title: `Exported ${selected.length} template(s)` });
  };
  const bulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        const { error: unlinkErr } = await supabase.from("campaigns").update({ template_id: null }).eq("template_id", id);
        if (unlinkErr) throw unlinkErr;
        const { error } = await supabase.from("templates").delete().eq("id", id);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["template-campaigns"] });
      toast({ title: `${selectedIds.size} template(s) deleted` });
      setSelectedIds(new Set());
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const normalizeSlug = (input: string) =>
    input
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9{}\-\/]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");

  const seoTitleLen = seoTitlePattern.replace(/\{[^}]+\}/g, "xxxxx").length;
  const seoDescLen = seoDescriptionPattern.replace(/\{[^}]+\}/g, "xxxxx").length;
  const seoTitleColor = seoTitleLen === 0 ? "text-muted-foreground" : seoTitleLen <= 60 ? "text-emerald-600" : seoTitleLen <= 70 ? "text-amber-600" : "text-destructive";
  const seoDescColor = seoDescLen === 0 ? "text-muted-foreground" : (seoDescLen >= 120 && seoDescLen <= 160) ? "text-emerald-600" : (seoDescLen >= 100 && seoDescLen <= 180) ? "text-amber-600" : "text-destructive";

  const loadSeoExtras = (config: Record<string, any>) => {
    setSlugPattern(config?._slugPattern || "");
    setOgTitlePattern(config?._ogTitle || "");
    setOgDescriptionPattern(config?._ogDescription || "");
    setOgImagePattern(config?._ogImage || "");
    setTwitterCard(config?._twitterCard || "summary_large_image");
    setCanonicalUrlPattern(config?._canonicalUrl || "");
    // PGP fields
    setExcerptPattern(config?._excerptPattern || "");
    setFeaturedImageSource(config?._featuredImageSource || "none");
    setFeaturedImageUrl(config?._featuredImageUrl || "");
    setFeaturedImageAlt(config?._featuredImageAlt || "");
    setFeaturedImageFilename(config?._featuredImageFilename || "");
    setCustomFields(config?._customFields || []);
    setTaxonomyCategories(config?._taxonomyCategories || "");
    setTaxonomyTags(config?._taxonomyTags || "");
    setPostType(config?._postType || "page");
    setAuthorPattern(config?._authorPattern || "");
    setCommentsEnabled(config?._commentsEnabled !== false);
    setHeaderCode(config?._headerCode || "");
    setFooterCode(config?._footerCode || "");
  };

  const buildSchemaConfig = () => ({
    ...schemaConfig,
    _slugPattern: slugPattern,
    _ogTitle: ogTitlePattern,
    _ogDescription: ogDescriptionPattern,
    _ogImage: ogImagePattern,
    _twitterCard: twitterCard,
    _canonicalUrl: canonicalUrlPattern,
    // PGP fields
    _excerptPattern: excerptPattern,
    _featuredImageSource: featuredImageSource,
    _featuredImageUrl: featuredImageUrl,
    _featuredImageAlt: featuredImageAlt,
    _featuredImageFilename: featuredImageFilename,
    _customFields: customFields,
    _taxonomyCategories: taxonomyCategories,
    _taxonomyTags: taxonomyTags,
    _postType: postType,
    _authorPattern: authorPattern,
    _commentsEnabled: commentsEnabled,
    _headerCode: headerCode,
    _footerCode: footerCode,
  });

  const resetAndClose = () => {
    setAiOpen(false);
    setOpen(false);
    setEditingTemplate(null);
    setName("");
    setContent("");
    setBlocks([]);
    setAiPrompt("");
    setActiveEditorTab("visual");
    setSeoTitlePattern("");
    setSeoDescriptionPattern("");
    setSlugPattern("");
    setOgTitlePattern("");
    setOgDescriptionPattern("");
    setOgImagePattern("");
    setTwitterCard("summary_large_image");
    setCanonicalUrlPattern("");
    setSchemaType("WebPage");
    setSchemaConfig({});
    // PGP fields
    setExcerptPattern("");
    setFeaturedImageSource("none");
    setFeaturedImageUrl("");
    setFeaturedImageAlt("");
    setFeaturedImageFilename("");
    setCustomFields([]);
    setTaxonomyCategories("");
    setTaxonomyTags("");
    setPostType("page");
    setAuthorPattern("");
    setCommentsEnabled(true);
    setHeaderCode("");
    setFooterCode("");
  };

  const importFileRef = useRef<HTMLInputElement>(null);

  const exportTemplate = (tpl: Template) => {
    const exportData = {
      name: tpl.name,
      content: tpl.content,
      variables: tpl.variables,
      seo_title_pattern: (tpl as any).seo_title_pattern || "",
      seo_description_pattern: (tpl as any).seo_description_pattern || "",
      schema_type: (tpl as any).schema_type || "WebPage",
      schema_config: (tpl as any).schema_config || {},
      exported_at: new Date().toISOString(),
      version: 1,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tpl.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.template.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Template exported", description: `"${tpl.name}" saved as JSON.` });
  };

  const importTemplate = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.name || !data.content) {
        throw new Error("Invalid template file: missing name or content.");
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");

      if (maxTemplates > 0 && templates.length >= maxTemplates) {
        throw new Error(`Your plan allows a maximum of ${maxTemplates} template(s). Please upgrade to add more.`);
      }

      const { error } = await supabase.from("templates").insert({
        name: data.name,
        content: data.content,
        variables: data.variables || [],
        user_id: user.id,
        workspace_id: wsId,
        seo_title_pattern: data.seo_title_pattern || "",
        seo_description_pattern: data.seo_description_pattern || "",
        schema_type: data.schema_type || "WebPage",
        schema_config: data.schema_config || {},
      } as any);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template imported", description: `"${data.name}" has been added.` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
    // Reset file input
    if (importFileRef.current) importFileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-display">{t("templates.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("templates.description")}</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {/* Hidden file input for import */}
          <input
            ref={importFileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importTemplate(file);
            }}
          />
          <Button
            variant="outline"
            className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            onClick={() => importFileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" /> {t("common.import")}
          </Button>
          {/* AI Content Generator */}
          <Button
            variant="outline"
            className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            onClick={() => setAiContentOpen(true)}
          >
            <Wand2 className="mr-2 h-4 w-4" /> {t("templates.aiContent")}
          </Button>
          {/* From CSV */}
          <Button
            variant="outline"
            className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            onClick={() => setCsvDialogOpen(true)}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> {t("templates.fromCsv")}
          </Button>
          {/* From Connected Site */}
          <Button
            variant="outline"
            className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
            onClick={() => setSiteDialogOpen(true)}
          >
            <Link2 className="mr-2 h-4 w-4" /> {t("templates.fromSite")}
          </Button>
          {/* AI Template Builder */}
          <Dialog open={aiOpen} onOpenChange={(v) => { if (!v) resetAndClose(); else setAiOpen(true); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
                <Sparkles className="mr-2 h-4 w-4" /> {t("templates.aiBuilder")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:w-[min(96vw,72rem)] sm:max-w-none max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] overflow-y-auto rounded-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Template Builder
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="ai-prompt">Describe the template you need</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Try an example or write your own prompt
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      "Landing page for a plumbing service company",
                      "Local SEO page for a dental clinic",
                      "Product page for an e-commerce store",
                      "Course landing page for an online academy",
                      "Restaurant location page with menu highlights",
                      "Real estate listing page for property agents",
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setAiPrompt(`Create a ${example.toLowerCase()}`)}
                        className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Create a landing page template for a plumbing service company with service details, pricing, and location-specific content..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={aiIncludeHeaderFooter} onCheckedChange={setAiIncludeHeaderFooter} id="ai-hf" />
                  <Label htmlFor="ai-hf" className="text-sm cursor-pointer">Include header & footer (uncheck to use your website's)</Label>
                </div>
                <Button
                  onClick={() => aiGenerateMutation.mutate(aiPrompt)}
                  disabled={!aiPrompt.trim() || aiGenerateMutation.isPending}
                  className="w-full"
                >
                  {aiGenerateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" /> Generate Template
                    </>
                  )}
                </Button>

                {/* Show generated result with code/preview tabs */}
                {content && (
                  <div className="space-y-4 pt-2 border-t border-border">
                    <div>
                      <Label htmlFor="ai-name">Template Name</Label>
                      <Input
                        id="ai-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <Tabs defaultValue="code" className="w-full">
                      <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="code" className="flex items-center gap-1.5">
                          <Code className="h-3.5 w-3.5" /> Code
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5" /> Preview
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="code" className="mt-3">
                        <Textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          rows={14}
                          className="font-mono text-xs"
                        />
                      </TabsContent>
                      <TabsContent value="preview" className="mt-3">
                        <TemplatePreview html={content} />
                      </TabsContent>
                    </Tabs>

                    {detectedVars.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">Detected variables:</span>
                        {[...new Set(detectedVars)].map((v) => (
                          <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { setContent(""); setName(""); }}>
                        Discard
                      </Button>
                      <Button
                        onClick={() => createMutation.mutate()}
                        disabled={!name || !content || createMutation.isPending}
                      >
                        {createMutation.isPending ? "Saving..." : "Save Template"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Manual / Edit Template */}
          <Dialog open={open || !!editingTemplate} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true); }}>
            {!editingTemplate && (
              <DialogTrigger asChild>
                <Button className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
                  <Plus className="mr-2 h-4 w-4" /> {t("templates.createTemplate")}
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:w-[min(96vw,72rem)] sm:max-w-none max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] overflow-y-auto rounded-lg">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="tpl-name">Template Name</Label>
                  <Input id="tpl-name" placeholder="e.g., Course Landing" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <Tabs value={activeEditorTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="grid h-auto w-full grid-cols-4 sm:grid-cols-8">
                    <TabsTrigger value="elementor" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Columns className="h-3.5 w-3.5" /> Page Builder
                    </TabsTrigger>
                    <TabsTrigger value="visual" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <LayoutPanelTop className="h-3.5 w-3.5" /> Blocks
                    </TabsTrigger>
                    <TabsTrigger value="code" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Code className="h-3.5 w-3.5" /> Code
                    </TabsTrigger>
                    <TabsTrigger value="fields" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <FileText className="h-3.5 w-3.5" /> Fields
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Globe className="h-3.5 w-3.5" /> SEO
                    </TabsTrigger>
                    <TabsTrigger value="schema" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Braces className="h-3.5 w-3.5" /> Schema
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="elementor" className="mt-3">
                    <ElementorEditor
                      html={content}
                      onChange={(newHtml) => setContent(newHtml)}
                      elementorJson={elementorJsonData}
                    />
                  </TabsContent>
                  <TabsContent value="visual" className="mt-3">
                    <TemplateVisualEditor
                      blocks={blocks}
                      onChange={handleBlocksChange}
                    />
                  </TabsContent>
                  <TabsContent value="code" className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Use &#123;variable&#125; syntax for dynamic fields.</p>
                    <Textarea
                      id="tpl-content"
                      placeholder={"<h1>{course} in {city}</h1>\n<p>Learn {course} in {city}...</p>"}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={12}
                      className="font-mono text-xs"
                    />
                  </TabsContent>
                  <TabsContent value="fields" className="mt-3">
                    <div className="space-y-5">
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
                        <p className="text-sm font-medium">Content Group Fields</p>
                        <p className="text-xs text-muted-foreground">
                          Configure fields matching Page Generator Pro. Use &#123;variable&#125; syntax for dynamic values.
                        </p>
                      </div>

                      {/* Post Type */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Post Type</Label>
                        <Select value={postType} onValueChange={setPostType}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="page">Page</SelectItem>
                            <SelectItem value="post">Post</SelectItem>
                            <SelectItem value="product">Product (WooCommerce)</SelectItem>
                            <SelectItem value="custom">Custom Post Type</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">The WordPress post type to generate.</p>
                      </div>

                      <Separator />

                      {/* Excerpt */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Excerpt Pattern</Label>
                        <Textarea
                          placeholder="e.g., Professional {service} in {city}. Call today for a free quote!"
                          value={excerptPattern}
                          onChange={(e) => setExcerptPattern(e.target.value)}
                          rows={2}
                          className="font-mono text-sm"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          The excerpt/summary for each generated page. Supports &#123;variable&#125; placeholders and spintax.
                        </p>
                      </div>

                      <Separator />

                      {/* Featured Image */}
                      <div className="space-y-3">
                        <Label className="text-xs font-medium">Featured Image</Label>
                        <Select value={featuredImageSource} onValueChange={setFeaturedImageSource}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="url">Image URL</SelectItem>
                            <SelectItem value="pexels">Pexels (Search)</SelectItem>
                            <SelectItem value="pixabay">Pixabay (Search)</SelectItem>
                            <SelectItem value="ai">AI Generated</SelectItem>
                            <SelectItem value="media">Media Library</SelectItem>
                          </SelectContent>
                        </Select>
                        {featuredImageSource !== "none" && (
                          <div className="rounded-lg border border-border p-3 space-y-3">
                            {(featuredImageSource === "url" || featuredImageSource === "media") && (
                              <div className="space-y-1.5">
                                <Label className="text-xs">Image URL / Path</Label>
                                <Input
                                  placeholder="e.g., https://example.com/images/{slug}.jpg or {featured_image}"
                                  value={featuredImageUrl}
                                  onChange={(e) => setFeaturedImageUrl(e.target.value)}
                                  className="font-mono text-sm h-9"
                                />
                              </div>
                            )}
                            {(featuredImageSource === "pexels" || featuredImageSource === "pixabay" || featuredImageSource === "ai") && (
                              <div className="space-y-1.5">
                                <Label className="text-xs">Search Query / Prompt</Label>
                                <Input
                                  placeholder="e.g., {service} {city} professional"
                                  value={featuredImageUrl}
                                  onChange={(e) => setFeaturedImageUrl(e.target.value)}
                                  className="font-mono text-sm h-9"
                                />
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Alt Text Pattern</Label>
                                <Input
                                  placeholder="{service} in {city}"
                                  value={featuredImageAlt}
                                  onChange={(e) => setFeaturedImageAlt(e.target.value)}
                                  className="font-mono text-sm h-9"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Filename Pattern</Label>
                                <Input
                                  placeholder="{slug}-featured"
                                  value={featuredImageFilename}
                                  onChange={(e) => setFeaturedImageFilename(e.target.value)}
                                  className="font-mono text-sm h-9"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Author */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Author</Label>
                        <Input
                          placeholder="e.g., {author} or specific username"
                          value={authorPattern}
                          onChange={(e) => setAuthorPattern(e.target.value)}
                          className="font-mono text-sm h-9"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          The author for generated pages. Use a variable for rotation from CSV data.
                        </p>
                      </div>

                      <Separator />

                      {/* Taxonomies */}
                      <div className="space-y-3">
                        <Label className="text-xs font-medium">Taxonomies</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Categories</Label>
                            <Input
                              placeholder="{category}, Services"
                              value={taxonomyCategories}
                              onChange={(e) => setTaxonomyCategories(e.target.value)}
                              className="font-mono text-sm h-9"
                            />
                            <p className="text-[11px] text-muted-foreground">Comma-separated. Supports variables.</p>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Tags</Label>
                            <Input
                              placeholder="{keyword}, {city}, local"
                              value={taxonomyTags}
                              onChange={(e) => setTaxonomyTags(e.target.value)}
                              className="font-mono text-sm h-9"
                            />
                            <p className="text-[11px] text-muted-foreground">Comma-separated. Supports variables.</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Custom Fields */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">Custom Fields (Post Meta)</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-lg"
                            onClick={() => setCustomFields([...customFields, { key: "", value: "" }])}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Field
                          </Button>
                        </div>
                        {customFields.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No custom fields defined. Click &quot;Add Field&quot; to create key/value pairs.</p>
                        ) : (
                          <div className="space-y-2">
                            {customFields.map((field, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Input
                                  placeholder="Meta Key"
                                  value={field.key}
                                  onChange={(e) => {
                                    const updated = [...customFields];
                                    updated[idx] = { ...updated[idx], key: e.target.value };
                                    setCustomFields(updated);
                                  }}
                                  className="font-mono text-sm h-8 flex-1"
                                />
                                <Input
                                  placeholder="Meta Value (supports {variables})"
                                  value={field.value}
                                  onChange={(e) => {
                                    const updated = [...customFields];
                                    updated[idx] = { ...updated[idx], value: e.target.value };
                                    setCustomFields(updated);
                                  }}
                                  className="font-mono text-sm h-8 flex-[2]"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Discussion */}
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-medium">Discussion</Label>
                          <p className="text-[11px] text-muted-foreground">Allow comments on generated pages</p>
                        </div>
                        <Switch checked={commentsEnabled} onCheckedChange={setCommentsEnabled} />
                      </div>

                      <Separator />

                      {/* Header & Footer Code */}
                      <div className="space-y-3">
                        <Label className="text-xs font-medium">Header & Footer Code</Label>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Header Code (injected in &lt;head&gt;)</Label>
                          <Textarea
                            placeholder='<link rel="stylesheet" href="...">'
                            value={headerCode}
                            onChange={(e) => setHeaderCode(e.target.value)}
                            rows={2}
                            className="font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Footer Code (injected before &lt;/body&gt;)</Label>
                          <Textarea
                            placeholder='<script src="..."></script>'
                            value={footerCode}
                            onChange={(e) => setFooterCode(e.target.value)}
                            rows={2}
                            className="font-mono text-xs"
                          />
                        </div>
                      </div>

                      {detectedVars.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Available variables from template:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {[...new Set(detectedVars)].map((v) => (
                              <Badge key={v} variant="outline" className="text-xs font-mono cursor-pointer hover:bg-accent"
                                onClick={() => navigator.clipboard.writeText(v)}>
                                {v}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="seo" className="mt-3">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
                        <p className="text-sm font-medium">SEO Meta Patterns</p>
                        <p className="text-xs text-muted-foreground">
                          Define patterns using &#123;variable&#125; syntax. These override AI-generated metadata when set.
                        </p>
                      </div>

                      {/* AI Generate SEO Button */}
                      <Button
                        variant="outline"
                        className="w-full border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all"
                        disabled={aiSeoGenerating}
                        onClick={async () => {
                          setAiSeoGenerating(true);
                          try {
                            const vars = [...new Set(content.match(/\{([a-z_]+)\}/gi) || [])];
                            const varNames = vars.map(v => v.replace(/[{}]/g, "")).join(", ");
                            const { data, error } = await supabase.functions.invoke("generate-template", {
                              body: {
                                prompt: `Generate ONLY two lines of text, nothing else:
Line 1: An SEO-optimized meta title pattern (under 60 chars) using these variables: ${varNames || "keyword, city"}
Line 2: An SEO-optimized meta description pattern (120-160 chars) using the same variables.

Use {variable_name} syntax. Include action words like "Best", "Top", "Professional", "Free Quote".
Make it compelling for both search engines and users.
Do NOT output HTML, markdown, or explanations — just two plain text lines.`
                              },
                            });
                            if (error) throw error;
                            if (data?.error) throw new Error(data.error);
                            const raw = (data.content || "").replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
                            const lines = raw.split("\n").map((l: string) => l.replace(/^(line\s*\d+\s*[:：]\s*)/i, "").replace(/^(meta\s*(title|description)\s*(pattern)?\s*[:：]\s*)/i, "").trim()).filter(Boolean);
                            if (lines[0]) setSeoTitlePattern(lines[0]);
                            if (lines[1]) setSeoDescriptionPattern(lines[1]);
                            toast({ title: "SEO patterns generated!", description: "AI-optimized meta title & description are ready." });
                          } catch (err: any) {
                            toast({ title: "AI generation failed", description: err.message, variant: "destructive" });
                          } finally {
                            setAiSeoGenerating(false);
                          }
                        }}
                      >
                        {aiSeoGenerating ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating optimized SEO patterns...</>
                        ) : (
                          <><Sparkles className="mr-2 h-4 w-4 text-primary" /> AI Generate SEO Meta Patterns</>
                        )}
                      </Button>

                      <div className="space-y-1.5">
                        <Label htmlFor="seo-title">Meta Title Pattern</Label>
                        <Input
                          id="seo-title"
                          placeholder="e.g., {keyword} in {city} | My Brand"
                          value={seoTitlePattern}
                          onChange={(e) => setSeoTitlePattern(e.target.value)}
                          className="font-mono text-sm"
                        />
                        <div className="space-y-1">
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${seoTitleLen <= 50 ? 'bg-emerald-500' : seoTitleLen <= 60 ? 'bg-amber-500' : 'bg-destructive'}`}
                              style={{ width: `${Math.min((seoTitleLen / 70) * 100, 100)}%` }}
                            />
                          </div>
                          <p className={`text-xs ${seoTitleColor}`}>
                            ~{seoTitleLen}/60 chars{seoTitleLen > 60 && " ⚠ May be truncated"}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="seo-desc">Meta Description Pattern</Label>
                        <Textarea
                          id="seo-desc"
                          placeholder="e.g., Find the best {keyword} services in {city}. Contact us today for a free quote."
                          value={seoDescriptionPattern}
                          onChange={(e) => setSeoDescriptionPattern(e.target.value)}
                          rows={3}
                          className="font-mono text-sm"
                        />
                        <div className="space-y-1">
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${seoDescLen >= 120 && seoDescLen <= 160 ? 'bg-emerald-500' : seoDescLen >= 100 && seoDescLen <= 180 ? 'bg-amber-500' : seoDescLen === 0 ? 'bg-muted' : 'bg-destructive'}`}
                              style={{ width: `${Math.min((seoDescLen / 180) * 100, 100)}%` }}
                            />
                          </div>
                          <p className={`text-xs ${seoDescColor}`}>
                            ~{seoDescLen}/160 chars{seoDescLen > 160 && " ⚠ May be truncated"}{seoDescLen > 0 && seoDescLen < 120 && " ⚠ Too short"}
                          </p>
                        </div>
                      </div>
                      {/* SERP Preview */}
                      {(seoTitlePattern || seoDescriptionPattern || slugPattern) && (
                        <div className="rounded-lg border border-border bg-background p-4 space-y-1">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Google Search Preview</p>
                          <div className="space-y-0.5">
                            <p className="text-[#1a0dab] text-lg leading-snug truncate" style={{ fontFamily: 'Arial, sans-serif' }}>
                              {seoTitlePattern
                                ? seoTitlePattern.replace(/\{([^}]+)\}/g, (_, v) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '))
                                : name || 'Page Title'}
                            </p>
                            <p className="text-[#006621] text-sm truncate" style={{ fontFamily: 'Arial, sans-serif' }}>
                              {canonicalUrlPattern
                                ? canonicalUrlPattern.replace(/\{([^}]+)\}/g, (_, v) => v.replace(/_/g, '-'))
                                : `https://example.com/${slugPattern ? slugPattern.replace(/\{([^}]+)\}/g, (_, v) => v.replace(/_/g, '-')) : 'page-slug'}`}
                            </p>
                            <p className="text-[#545454] text-sm leading-relaxed line-clamp-2" style={{ fontFamily: 'Arial, sans-serif' }}>
                              {seoDescriptionPattern
                                ? seoDescriptionPattern.replace(/\{([^}]+)\}/g, (_, v) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' '))
                                : 'Meta description will appear here...'}
                            </p>
                          </div>
                        </div>
                      )}

                      <Separator />

                      <div className="space-y-1.5">
                        <Label htmlFor="slug-pattern">Slug Pattern</Label>
                        <Input
                          id="slug-pattern"
                          placeholder="e.g., {keyword}-{city}"
                          value={slugPattern}
                          onChange={(e) => setSlugPattern(normalizeSlug(e.target.value))}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Auto-normalized: lowercase, no accents, hyphens only. Use &#123;variable&#125; placeholders.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="canonical-url">Canonical URL Pattern</Label>
                        <Input
                          id="canonical-url"
                          placeholder="e.g., https://example.com/{slug}"
                          value={canonicalUrlPattern}
                          onChange={(e) => setCanonicalUrlPattern(e.target.value)}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Default canonical URL for generated pages. Use &#123;slug&#125; to insert the page slug.
                        </p>
                      </div>

                      <Separator />

                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open Graph & Twitter</p>

                      <div className="space-y-1.5">
                        <Label htmlFor="og-title">OG Title</Label>
                        <Input
                          id="og-title"
                          placeholder="Defaults to Meta Title if empty"
                          value={ogTitlePattern}
                          onChange={(e) => setOgTitlePattern(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="og-desc">OG Description</Label>
                        <Input
                          id="og-desc"
                          placeholder="Defaults to Meta Description if empty"
                          value={ogDescriptionPattern}
                          onChange={(e) => setOgDescriptionPattern(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="og-image">OG Image URL</Label>
                        <Input
                          id="og-image"
                          placeholder="e.g., https://example.com/images/{slug}.jpg"
                          value={ogImagePattern}
                          onChange={(e) => setOgImagePattern(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Twitter Card Type</Label>
                        <Select value={twitterCard} onValueChange={setTwitterCard}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="summary">Summary</SelectItem>
                            <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                            <SelectItem value="app">App</SelectItem>
                            <SelectItem value="player">Player</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {detectedVars.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Available variables from template:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {[...new Set(detectedVars)].map((v) => (
                              <Badge key={v} variant="outline" className="text-xs font-mono cursor-pointer hover:bg-accent"
                                onClick={() => {
                                  navigator.clipboard.writeText(v);
                                }}>
                                {v}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="schema" className="mt-3">
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
                        <p className="text-sm font-medium">Structured Data (JSON-LD)</p>
                        <p className="text-xs text-muted-foreground">
                          Configure Schema.org structured data that will be injected into each generated page.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Schema Type</Label>
                        <Select value={schemaType} onValueChange={setSchemaType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WebPage">WebPage</SelectItem>
                            <SelectItem value="LocalBusiness">LocalBusiness</SelectItem>
                            <SelectItem value="Product">Product</SelectItem>
                            <SelectItem value="FAQPage">FAQPage</SelectItem>
                            <SelectItem value="Article">Article</SelectItem>
                            <SelectItem value="Service">Service</SelectItem>
                            <SelectItem value="Organization">Organization</SelectItem>
                            <SelectItem value="Event">Event</SelectItem>
                            <SelectItem value="SoftwareApplication">SoftwareApplication</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {schemaType === "LocalBusiness" && (
                        <div className="space-y-3 rounded-lg border border-border p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">LocalBusiness Fields</p>
                          {[
                            { key: "name", label: "Business Name", placeholder: "{company}" },
                            { key: "telephone", label: "Phone", placeholder: "{phone}" },
                            { key: "email", label: "Email", placeholder: "{email}" },
                            { key: "addressLocality", label: "City", placeholder: "{city}" },
                            { key: "addressRegion", label: "Region", placeholder: "{region}" },
                            { key: "addressCountry", label: "Country", placeholder: "{country}" },
                            { key: "postalCode", label: "Postal Code", placeholder: "{postcode}" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key} className="grid grid-cols-3 gap-2 items-center">
                              <Label className="text-xs">{label}</Label>
                              <Input
                                className="col-span-2 text-sm font-mono h-8"
                                placeholder={placeholder}
                                value={schemaConfig[key] || ""}
                                onChange={(e) => setSchemaConfig({ ...schemaConfig, [key]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {schemaType === "Product" && (
                        <div className="space-y-3 rounded-lg border border-border p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product Fields</p>
                          {[
                            { key: "name", label: "Product Name", placeholder: "{name}" },
                            { key: "description", label: "Description", placeholder: "{description}" },
                            { key: "price", label: "Price", placeholder: "{price}" },
                            { key: "currency", label: "Currency", placeholder: "USD" },
                            { key: "brand", label: "Brand", placeholder: "{brand}" },
                            { key: "sku", label: "SKU", placeholder: "{sku}" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key} className="grid grid-cols-3 gap-2 items-center">
                              <Label className="text-xs">{label}</Label>
                              <Input
                                className="col-span-2 text-sm font-mono h-8"
                                placeholder={placeholder}
                                value={schemaConfig[key] || ""}
                                onChange={(e) => setSchemaConfig({ ...schemaConfig, [key]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {schemaType === "FAQPage" && (
                        <div className="space-y-3 rounded-lg border border-border p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">FAQ Fields</p>
                          {[
                            { key: "question", label: "Question Column", placeholder: "{question}" },
                            { key: "answer", label: "Answer Column", placeholder: "{answer}" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key} className="grid grid-cols-3 gap-2 items-center">
                              <Label className="text-xs">{label}</Label>
                              <Input
                                className="col-span-2 text-sm font-mono h-8"
                                placeholder={placeholder}
                                value={schemaConfig[key] || ""}
                                onChange={(e) => setSchemaConfig({ ...schemaConfig, [key]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {(schemaType === "Article" || schemaType === "Service" || schemaType === "Event" || schemaType === "Organization") && (
                        <div className="space-y-3 rounded-lg border border-border p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{schemaType} Fields</p>
                          {[
                            { key: "name", label: "Name", placeholder: "{name}" },
                            { key: "description", label: "Description", placeholder: "{description}" },
                            { key: "url", label: "URL", placeholder: "{url}" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key} className="grid grid-cols-3 gap-2 items-center">
                              <Label className="text-xs">{label}</Label>
                              <Input
                                className="col-span-2 text-sm font-mono h-8"
                                placeholder={placeholder}
                                value={schemaConfig[key] || ""}
                                onChange={(e) => setSchemaConfig({ ...schemaConfig, [key]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {schemaType === "SoftwareApplication" && (
                        <div className="space-y-3 rounded-lg border border-border p-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">SoftwareApplication Fields</p>
                          {[
                            { key: "name", label: "App Name", placeholder: "{name}" },
                            { key: "operatingSystem", label: "OS", placeholder: "Windows, macOS, Linux" },
                            { key: "applicationCategory", label: "Category", placeholder: "BusinessApplication" },
                            { key: "offers.price", label: "Price", placeholder: "{price}" },
                            { key: "offers.priceCurrency", label: "Currency", placeholder: "USD" },
                            { key: "aggregateRating.ratingValue", label: "Rating", placeholder: "{rating}" },
                            { key: "aggregateRating.ratingCount", label: "Review Count", placeholder: "{review_count}" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key} className="grid grid-cols-3 gap-2 items-center">
                              <Label className="text-xs">{label}</Label>
                              <Input
                                className="col-span-2 text-sm font-mono h-8"
                                placeholder={placeholder}
                                value={schemaConfig[key] || ""}
                                onChange={(e) => setSchemaConfig({ ...schemaConfig, [key]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      )}


                      <div className="space-y-1.5">
                        <Label className="text-xs">JSON-LD Preview</Label>
                        <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                          {JSON.stringify(
                            {
                              "@context": "https://schema.org",
                              "@type": schemaType,
                              ...Object.fromEntries(
                                Object.entries(schemaConfig).filter(([k, v]) => v && !k.startsWith("_"))
                              ),
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="preview" className="mt-3">
                    {content ? (
                      <TemplatePreview html={content} />
                    ) : (
                      <div className="flex items-center justify-center h-32 border border-dashed border-border rounded-md text-muted-foreground text-sm">
                        Add blocks in the Visual tab or write HTML in the Code tab
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
                {/* Live Score Preview Panel */}
                {content.trim().length > 0 && (() => {
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  const seoScore = calculateContentSeoScore(name, content, slug);
                  const seaScore = calculateContentSeaScore(name, content, slug);
                  const geoScore = calculateContentGeoScore(name, content, slug);
                  const avgScore = Math.round((seoScore.score + seaScore.score + geoScore.score) / 3);
                  const avgColor = avgScore >= 85 ? "text-emerald-600" : avgScore >= 60 ? "text-primary" : avgScore >= 35 ? "text-amber-600" : "text-destructive";
                  const targetChecks = 7; // 7 out of 8 checks = 87.5% ≈ 80+
                  const buildTargetInfo = (scoreResult: typeof seoScore, label: string) => {
                    const failed = scoreResult.checks.filter(c => !c.passed);
                    const passed = scoreResult.checks.filter(c => c.passed);
                    const needMore = Math.max(0, targetChecks - passed.length);
                    const isTarget = scoreResult.score >= 80;
                    return { failed, passed, needMore, isTarget, label };
                  };
                  const targets = [
                    { emoji: "🔍", ...buildTargetInfo(seoScore, "SEO"), score: seoScore },
                    { emoji: "💰", ...buildTargetInfo(seaScore, "SEA"), score: seaScore },
                    { emoji: "📍", ...buildTargetInfo(geoScore, "GEO"), score: geoScore },
                  ];
                  const allAbove80 = targets.every(t => t.isTarget);
                  return (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <Wand2 className="h-4 w-4 text-primary" />
                          Live Score Preview
                        </p>
                        <span className={`text-sm font-bold ${avgColor}`}>
                          Avg: {avgScore}/100
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {targets.map((t) => (
                          <div key={t.label} className={`flex flex-col items-center gap-1.5 rounded-md border bg-background p-3 ${t.isTarget ? "border-emerald-500/50" : "border-border"}`}>
                            <span className="text-xs font-medium text-muted-foreground">{t.emoji} {t.label}</span>
                            <SeoScoreBadge score={t.score.score} label={t.score.label} color={t.score.color} checks={t.score.checks} size="md" scoreType={t.label} />
                            {t.isTarget ? (
                              <span className="text-[10px] font-medium text-emerald-600">✓ Target reached</span>
                            ) : (
                              <span className="text-[10px] font-medium text-amber-600">Need {t.needMore} more check{t.needMore !== 1 ? "s" : ""}</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Target indicator: show failing checks that matter most */}
                      {!allAbove80 && (
                        <div className="rounded-md border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            🎯 Fix these to reach 80+ on all metrics
                          </p>
                          {targets.filter(t => !t.isTarget).map((t) => (
                            <div key={t.label} className="space-y-1">
                              <p className="text-[11px] font-semibold text-foreground">{t.emoji} {t.label} — need {t.needMore} of {t.failed.length} failing:</p>
                              <div className="grid gap-1 pl-2">
                                {t.failed.map((check, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <span className="text-destructive text-[10px] mt-px shrink-0">✕</span>
                                    <div>
                                      <span className="text-[11px] font-medium text-foreground">{check.label}</span>
                                      {check.tip && <span className="text-[10px] text-muted-foreground ml-1">— {check.tip}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            disabled={aiAutoFixing}
                            onClick={async () => {
                              setAiAutoFixing(true);
                              try {
                                const allFailing = targets.filter(t => !t.isTarget).flatMap(t =>
                                  t.failed.map(c => `[${t.label}] ${c.label}: ${c.tip}`)
                                );
                                const vars = [...new Set(content.match(/\{([a-z_]+)\}/gi) || [])];
                                const { data, error } = await supabase.functions.invoke("generate-template", {
                                  body: {
                                    prompt: `You are given an existing HTML template. Improve it so ALL three scores (SEO, SEA, GEO) reach 80+.

CURRENT TEMPLATE:
${content}

CURRENT VARIABLES USED: ${vars.join(", ")}

FAILING CHECKS TO FIX:
${allFailing.join("\n")}

RULES:
- Keep ALL existing {variable} placeholders intact — do NOT remove or rename them
- Keep the existing structure and design intent
- ADD missing elements to pass the failing checks:
  * For SEO: ensure h1/h2/h3 headings, 300+ words, images with alt text, links, descriptive content
  * For SEA: add <button> or <a class="btn cta">, <form> with inputs, trust signals (★ reviews, "Guarantee"), pricing section, action words in headings
  * For GEO: add {city}/{state} in title, street address pattern, "Phone: {phone}", map/directions reference, opening hours, "near me"/"serving {city}" phrases, LocalBusiness schema mention
- Output ONLY the improved raw HTML. No markdown fences, no explanations.`
                                  },
                                });
                                if (error) throw error;
                                if (data?.error) throw new Error(data.error);
                                const improved = (data.content || "").replace(/^```html?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
                                if (improved) {
                                  setContent(improved);
                                  setBlocks(htmlToBlocks(improved));
                                  toast({ title: "Content auto-fixed!", description: "AI has improved your template to target 80+ on all scores." });
                                }
                              } catch (err: any) {
                                toast({ title: "Auto-fix failed", description: err.message, variant: "destructive" });
                              } finally {
                                setAiAutoFixing(false);
                              }
                            }}
                          >
                            {aiAutoFixing ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Auto-fixing content...</>
                            ) : (
                              <><Sparkles className="mr-2 h-4 w-4" /> Auto-Fix with AI</>
                            )}
                          </Button>
                        </div>
                      )}
                      {allAbove80 && (
                        <p className="text-xs text-emerald-600 font-medium text-center">
                          ✅ All scores are above 80 — your content is well-optimized!
                        </p>
                      )}
                    </div>
                  );
                })()}
                {detectedVars.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Detected variables:</span>
                    {[...new Set(detectedVars)].map((v) => (
                      <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={resetAndClose}>{t("common.cancel")}</Button>
                  {editingTemplate ? (
                    <Button onClick={() => updateMutation.mutate()} disabled={!name || !content || updateMutation.isPending}>
                      {updateMutation.isPending ? t("settings.saving") : t("common.saveChanges")}
                    </Button>
                  ) : (
                    <Button onClick={() => createMutation.mutate()} disabled={!name || !content || createMutation.isPending}>
                      {createMutation.isPending ? t("common.loading") : t("templates.createTemplate")}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* US14 – Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("common.searchTemplates")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={siteTypeFilter} onValueChange={setSiteTypeFilter}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder={t("common.allPlatforms")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allPlatforms")}</SelectItem>
            <SelectItem value="wordpress">WordPress</SelectItem>
            <SelectItem value="shopify">Shopify</SelectItem>
            <SelectItem value="prestashop">PrestaShop</SelectItem>
            <SelectItem value="woocommerce">WooCommerce</SelectItem>
          </SelectContent>
        </Select>
        <Select value={campaignTypeFilter} onValueChange={setCampaignTypeFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder={t("common.allTypes")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allTypes")}</SelectItem>
            <SelectItem value="seo">SEO</SelectItem>
            <SelectItem value="sea">SEA</SelectItem>
            <SelectItem value="geo">GEO</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1 border rounded-md p-0.5">
          <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("table")} title="Table view">
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "cards" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("cards")} title="Card view">
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          {templates.length === 0 ? t("templates.noTemplatesYet") : t("templates.noTemplatesFiltered")}
        </CardContent></Card>
      ) : viewMode === "table" ? (
        <>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
              <span className="text-sm font-medium">{t("templates.selectedCount", { count: selectedIds.size })}</span>
              <Button variant="outline" size="sm" onClick={bulkExport}><Download className="h-3.5 w-3.5 mr-1.5" /> {t("common.export")}</Button>
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}><Trash2 className="h-3.5 w-3.5 mr-1.5" /> {t("common.delete")}</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>{t("common.cancel")}</Button>
            </div>
          )}
          <Card>
            {/* Mobile & Tablet: Card layout */}
            <div className="lg:hidden divide-y divide-border">
              {(() => {
                const totalPages = Math.max(1, Math.ceil(orderedTemplates.length / pageSize));
                const safePage = Math.min(currentPage, totalPages);
                const start = (safePage - 1) * pageSize;
                const paginated = orderedTemplates.slice(start, start + pageSize);
                return paginated.map((tpl) => {
                  const info = campaignsByTemplate[tpl.id];
                  const siteTypes = templateSiteTypes[tpl.id];
                  const cTypes = info?.campaignTypes;
                  const copies = dupCounts[tpl.id] ?? 0;
                  return (
                    <div key={tpl.id} className={`p-3 flex items-start gap-3 ${selectedIds.has(tpl.id) ? "bg-primary/5" : "hover:bg-muted/50"} transition-colors`}>
                      <Checkbox checked={selectedIds.has(tpl.id)} onCheckedChange={() => toggleSelect(tpl.id)} className="mt-1 shrink-0" aria-label={`Select ${tpl.name}`} />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-medium text-sm truncate">{tpl.name}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {siteTypes && siteTypes.size > 0 && [...siteTypes].map((st) => (
                            <Badge key={st} variant="outline" className="text-[10px] capitalize">{st}</Badge>
                          ))}
                          {cTypes && cTypes.size > 0 && [...cTypes].map((ct) => (
                            <Badge key={ct} variant="secondary" className="text-[10px] uppercase">{ct}</Badge>
                          ))}
                          <span className="text-[10px] text-muted-foreground">{(tpl.variables || []).length} vars</span>
                          <span className="text-[10px] text-muted-foreground">{info?.count ?? 0} campaigns</span>
                          {copies > 0 && <Badge variant="outline" className="text-[10px]"><Copy className="h-2.5 w-2.5 mr-0.5" />{copies}</Badge>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Updated {new Date(tpl.updated_at).toLocaleDateString()}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => { setEditingTemplate(tpl); setName(tpl.name); setContent(tpl.content); setBlocks(htmlToBlocks(tpl.content)); setActiveEditorTab("visual"); setSeoTitlePattern((tpl as any).seo_title_pattern || ""); setSeoDescriptionPattern((tpl as any).seo_description_pattern || ""); setSchemaType((tpl as any).schema_type || "WebPage"); const cfg = (tpl as any).schema_config || {}; setSchemaConfig(cfg); loadSeoExtras(cfg); }}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(tpl)}>
                            <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportTemplate(tpl)}>
                            <Download className="h-3.5 w-3.5 mr-2" /> Export
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => checkAndDelete(tpl.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden lg:block w-full overflow-hidden">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><Checkbox checked={orderedTemplates.length > 0 && selectedIds.size === orderedTemplates.length} onCheckedChange={toggleSelectAll} aria-label="Select all" /></TableHead>
                    <TableHead className="w-[30%]"><button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("name")}>{t("templates.templateName")} <SortIcon col="name" /></button></TableHead>
                    <TableHead className="hidden xl:table-cell w-[10%]">{t("templates.siteType")}</TableHead>
                    <TableHead className="w-[12%]">{t("templates.campaignTypes")}</TableHead>
                    <TableHead className="w-[6%]">{t("templates.variables")}</TableHead>
                    <TableHead className="hidden 2xl:table-cell w-[6%]">{t("templates.copies")}</TableHead>
                    <TableHead className="w-[10%]"><button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("campaigns")}>{t("templates.usedIn")} <SortIcon col="campaigns" /></button></TableHead>
                    <TableHead className="hidden 2xl:table-cell w-[8%]">{t("templates.lastUsed")}</TableHead>
                    <TableHead className="w-[10%]"><button className="flex items-center hover:text-foreground transition-colors" onClick={() => toggleSort("date")}>{t("templates.lastUpdated")} <SortIcon col="date" /></button></TableHead>
                    <TableHead className="text-right w-10">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const totalPages = Math.max(1, Math.ceil(orderedTemplates.length / pageSize));
                    const safePage = Math.min(currentPage, totalPages);
                    const start = (safePage - 1) * pageSize;
                    const paginated = orderedTemplates.slice(start, start + pageSize);
                    return paginated.map((tpl) => {
                    const info = campaignsByTemplate[tpl.id];
                    const siteTypes = templateSiteTypes[tpl.id];
                    const cTypes = info?.campaignTypes;
                    const copies = dupCounts[tpl.id] ?? 0;
                    return (
                      <TableRow key={tpl.id} data-state={selectedIds.has(tpl.id) ? "selected" : undefined}>
                        <TableCell><Checkbox checked={selectedIds.has(tpl.id)} onCheckedChange={() => toggleSelect(tpl.id)} aria-label={`Select ${tpl.name}`} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium truncate">{tpl.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {siteTypes && siteTypes.size > 0 ? (
                            <div className="flex flex-wrap gap-1">{[...siteTypes].map((t) => <Badge key={t} variant="outline" className="text-[10px] capitalize">{t}</Badge>)}</div>
                          ) : <span className="text-xs text-muted-foreground">Generic</span>}
                        </TableCell>
                        <TableCell>
                          {cTypes && cTypes.size > 0 ? (
                            <div className="flex flex-wrap gap-1">{[...cTypes].map((t) => <Badge key={t} variant="secondary" className="text-[10px] uppercase">{t}</Badge>)}</div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{(tpl.variables || []).length}</span></TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {copies > 0 ? (
                            <Badge variant="outline" className="text-[10px]"><Copy className="h-3 w-3 mr-1" />{copies}</Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{info?.count ?? 0} campaign{(info?.count ?? 0) !== 1 ? "s" : ""}</span>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {info?.lastUsedAt ? (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(info.lastUsedAt).toLocaleDateString()}</span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(tpl.updated_at).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => { setEditingTemplate(tpl); setName(tpl.name); setContent(tpl.content); setBlocks(htmlToBlocks(tpl.content)); setActiveEditorTab("visual"); setSeoTitlePattern((tpl as any).seo_title_pattern || ""); setSeoDescriptionPattern((tpl as any).seo_description_pattern || ""); setSchemaType((tpl as any).schema_type || "WebPage"); const cfg = (tpl as any).schema_config || {}; setSchemaConfig(cfg); loadSeoExtras(cfg); }}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicateMutation.mutate(tpl)}>
                                  <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportTemplate(tpl)}>
                                  <Download className="h-3.5 w-3.5 mr-2" /> Export
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => checkAndDelete(tpl.id)}>
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  });
                  })()}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            {orderedTemplates.length > pageSize && (() => {
              const totalPages = Math.max(1, Math.ceil(orderedTemplates.length / pageSize));
              const safePage = Math.min(currentPage, totalPages);
              const start = (safePage - 1) * pageSize;
              return (
                <div className="flex items-center justify-between px-4 py-3 border-t flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">
                    Showing {start + 1}–{Math.min(start + pageSize, orderedTemplates.length)} of {orderedTemplates.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce<(number | "...")[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span key={`e${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                        ) : (
                          <Button key={p} variant={p === safePage ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(p as number)}>
                            {p}
                          </Button>
                        )
                      )}
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })()}
          </Card>
          {/* Bulk delete confirmation */}
          <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} template(s)?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected templates and unlink them from any campaigns. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={bulkDelete}>
                  Delete {selectedIds.size} template(s)
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hasCustomOrder && (
            <div className="col-span-full flex justify-end">
              <Button variant="ghost" size="sm" onClick={resetOrder} className="text-xs text-muted-foreground">
                <RotateCcw className="h-3 w-3 mr-1.5" /> Reset order
              </Button>
            </div>
          )}
          {orderedTemplates.map((tpl, index) => {
            const dragProps = getDragProps(index);
            const info = campaignsByTemplate[tpl.id];
            return (
            <Card key={tpl.id} className={`shadow-surface hover:shadow-surface-hover transition-shadow duration-150 ${dragProps.className}`} draggable={dragProps.draggable} onDragStart={dragProps.onDragStart} onDragOver={dragProps.onDragOver} onDrop={dragProps.onDrop} onDragEnd={dragProps.onDragEnd}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-0.5 -ml-1 shrink-0"><GripVertical className="h-4 w-4" /></button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">Drag to reorder</TooltipContent>
                    </Tooltip>
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold truncate">{tpl.name}</h3>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 flex-wrap justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTemplate(tpl); setName(tpl.name); setContent(tpl.content); setBlocks(htmlToBlocks(tpl.content)); setActiveEditorTab("visual"); setSeoTitlePattern((tpl as any).seo_title_pattern || ""); setSeoDescriptionPattern((tpl as any).seo_description_pattern || ""); setSchemaType((tpl as any).schema_type || "WebPage"); const cfg = (tpl as any).schema_config || {}; setSchemaConfig(cfg); loadSeoExtras(cfg); }} title="Edit">
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateMutation.mutate(tpl)} title="Duplicate"><Copy className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => exportTemplate(tpl)} title="Export JSON"><Download className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => checkAndDelete(tpl.id)}><Trash2 className="h-3 w-3" /></Button>
                    <TemplateVersionHistory templateId={tpl.id} currentContent={tpl.content} currentName={tpl.name} onRestore={(version) => { setEditingTemplate(tpl); setName(version.name); setContent(version.content); setBlocks(htmlToBlocks(version.content)); setActiveEditorTab("visual"); setSeoTitlePattern(version.seo_title_pattern || ""); setSeoDescriptionPattern(version.seo_description_pattern || ""); toast({ title: "Version restored", description: "Review and save to confirm." }); }} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  {info && info.count > 0 && <Badge variant="secondary" className="text-[10px]">{info.count} campaign{info.count !== 1 ? "s" : ""}</Badge>}
                  {(tpl.variables || []).map((v) => <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>)}
                </div>
                <Tabs defaultValue="visual" className="mt-3">
                  <TabsList className="h-8 w-full grid grid-cols-2">
                    <TabsTrigger value="visual" className="text-xs gap-1.5"><Eye className="h-3 w-3" /> Visual</TabsTrigger>
                    <TabsTrigger value="code" className="text-xs gap-1.5"><Code className="h-3 w-3" /> Code</TabsTrigger>
                  </TabsList>
                  <TabsContent value="visual" className="mt-2"><TemplatePreview html={tpl.content} /></TabsContent>
                  <TabsContent value="code" className="mt-2"><pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto leading-relaxed max-h-40 overflow-y-auto">{tpl.content}</pre></TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget && deleteTarget.linkedCampaigns.length > 0 ? "Template in use" : "Delete template?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {deleteTarget && deleteTarget.linkedCampaigns.length > 0 ? (
                  <>
                    <span>This template is linked to {deleteTarget.linkedCampaigns.length} campaign(s):</span>
                    <span className="font-medium block mt-1">
                      {deleteTarget.linkedCampaigns.map((c) => c.name).join(", ")}
                    </span>
                    <span className="block mt-2">
                      <strong>Force delete</strong> will unlink all campaigns and delete the template.
                    </span>
                  </>
                ) : (
                  <span>This action cannot be undone. The template will be permanently deleted.</span>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && performDelete(deleteTarget.id, deleteTarget.linkedCampaigns.length > 0)}
            >
              {deleteTarget && deleteTarget.linkedCampaigns.length > 0 ? "Force Delete" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Template Dialog */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Create Template from CSV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Paste your CSV data below. The first row (headers) will be converted into template variables automatically.
            </p>
            <div>
              <Label>Template Name</Label>
              <Input
                placeholder="e.g., Product Landing Template"
                value={csvTemplateName}
                onChange={(e) => setCsvTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label>CSV Data (paste or type)</Label>
              <Textarea
                placeholder={"city,service,phone\nNew York,Plumbing,555-0100\nLos Angeles,HVAC,555-0200"}
                value={csvTemplateText}
                onChange={(e) => setCsvTemplateText(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
              {csvTemplateText.trim() && (() => {
                const headers = csvTemplateText.split("\n")[0]?.split(",").map(h => h.trim()).filter(Boolean) || [];
                return headers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-xs text-muted-foreground">Variables:</span>
                    {headers.map(h => (
                      <Badge key={h} variant="outline" className="text-xs font-mono">
                        {`{${h.toLowerCase().replace(/[^a-z0-9]+/g, "_")}}`}
                      </Badge>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCsvDialogOpen(false)}>Cancel</Button>
              <Button onClick={createFromCsv} disabled={!csvTemplateText.trim()}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Connected Site Template Dialog */}
      <Dialog open={siteDialogOpen} onOpenChange={(v) => { setSiteDialogOpen(v); if (!v) { setSitePages([]); setSiteTemplateWebsite(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Import Template from Connected Site
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Select a connected website and choose a page to use as a template base.
            </p>
            {connectedWebsites.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
                No connected websites found. Add one in Settings → Websites first.
              </p>
            ) : (
              <>
                <Select
                  value={siteTemplateWebsite}
                  onValueChange={(val) => {
                    setSiteTemplateWebsite(val);
                    loadSitePages(val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a connected site" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectedWebsites.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{w.type}</Badge>
                          {w.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {siteLoadingPages && (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                )}

                {sitePages.length > 0 && (
                  <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2">
                    {sitePages.map((page) => (
                      <button
                        key={page.id}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent/50 transition-colors text-left"
                        onClick={() => importSitePage(page.link, page.title, page.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{page.title}</p>
                          <p className="text-xs text-muted-foreground truncate">/{page.slug}</p>
                        </div>
                        <Download className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}

                {!siteLoadingPages && siteTemplateWebsite && sitePages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No pages found on this site.</p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Content Generator Dialog */}
      <Dialog open={aiContentOpen} onOpenChange={(v) => { setAiContentOpen(v); if (!v) { setAiKeywords(""); setAiContentType("seo"); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              AI Content Generator
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
              <p className="text-sm font-medium">Generate SEO-optimized content</p>
              <p className="text-xs text-muted-foreground">
                Enter your target keywords and we'll generate content that scores <strong>80+</strong> on SEO, SEA, and GEO metrics automatically.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Target Keywords</Label>
              <Input
                placeholder="e.g., plumbing services, emergency plumber, pipe repair"
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Separate multiple keywords with commas</p>
            </div>

            <div className="space-y-1.5">
              <Label>Content Focus</Label>
              <Select value={aiContentType} onValueChange={setAiContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seo">
                    <span className="flex items-center gap-2">🔍 SEO — Organic search optimization</span>
                  </SelectItem>
                  <SelectItem value="sea">
                    <span className="flex items-center gap-2">💰 SEA — Paid landing page conversion</span>
                  </SelectItem>
                  <SelectItem value="geo">
                    <span className="flex items-center gap-2">📍 GEO — Local search targeting</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground w-full mb-1">Quick keyword ideas:</span>
              {[
                "plumbing services, emergency plumber",
                "dental clinic, teeth whitening",
                "real estate agent, home buying",
                "restaurant, food delivery",
                "auto repair, car service",
                "web design, digital marketing",
              ].map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setAiKeywords(kw)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  {kw}
                </button>
              ))}
            </div>

            <Button
              onClick={() => aiContentMutation.mutate({ keywords: aiKeywords, contentType: aiContentType })}
              disabled={!aiKeywords.trim() || aiContentMutation.isPending}
              className="w-full"
            >
              {aiContentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating high-score content...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" /> Generate Content (80+ Score)
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
