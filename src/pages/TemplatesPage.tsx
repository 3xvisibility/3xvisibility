import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Plus, FileText, Copy, Trash2, Sparkles, Upload, Download,
  Search as SearchIcon, Pencil, MoreVertical, LayoutGrid, List,
  ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet, Link2,
  ChevronLeft, ChevronRight, Loader2, MonitorSmartphone, ShoppingBag, Briefcase,
  Wand2, Eye, AlertTriangle, Crown, Palette, History, Columns, LayoutTemplate, RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSubscription } from "@/hooks/use-subscription";
import { filterDesignVars } from "@/lib/design-vars-filter";
import { friendlyError } from "@/lib/friendly-errors";

import { htmlToBlocks } from "@/components/templates/TemplateVisualEditor";
import { AiTemplateBuilderDialog } from "@/components/templates/AiTemplateBuilderDialog";
import { TemplateEditorDialog } from "@/components/templates/TemplateEditorDialog";
import { TemplatePreviewDialog, type PreviewableTemplate } from "@/components/templates/TemplatePreviewDialog";
import { TemplateCreationPicker, type CreationMethod, type ContentType } from "@/components/templates/TemplateCreationPicker";
import { TemplateCustomizerDialog } from "@/components/templates/TemplateCustomizerDialog";
import { downloadStarterCsv } from "@/lib/csv-starter";
import { TemplateVersionBadge } from "@/components/templates/TemplateVersionBadge";
import { TemplateVersionHistoryDialog } from "@/components/templates/TemplateVersionHistoryDialog";
import { recordVersionById, recordVersionForLatest } from "@/lib/template-version-history";
import { COMMUNITY_TEMPLATES } from "@/lib/marketplace-templates";
import { SITE_LANGUAGE_OPTIONS } from "@/components/websites/WebsiteLanguageSelect";
import { computeMarketplaceVersion } from "@/lib/marketplace-versioning";
import { applyTemplateVariables, autoExtractTemplateVariables } from "@/lib/template-variable-extractor";
import ContainerWidthControl from "@/components/settings/ContainerWidthControl";
import BulkBoxSettingsDialog from "@/components/settings/BulkBoxSettingsDialog";
import {
  type SectionVariants, DEFAULT_VARIANTS, summarizeVariants,
  HERO_VARIANTS, GRID_VARIANTS, CTA_VARIANTS, FAQ_VARIANTS,
  type HeroVariant, type GridVariant, type CtaVariant, type FaqVariant,
} from "@/lib/section-variants";

type Template = Tables<"templates">;
const PAGE_SIZE = 10;

export default function TemplatesPage() {
  const [aiOpen, setAiOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [customizeTemplate, setCustomizeTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<PreviewableTemplate | null>(null);
  const [previewTemplateRow, setPreviewTemplateRow] = useState<Template | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingKeywords, setPendingKeywords] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [siteTypeFilter, setSiteTypeFilter] = useState("all");
  const [campaignTypeFilter, setCampaignTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [sortColumn, setSortColumn] = useState<"name" | "date" | "campaigns">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; linkedCampaigns: { id: string; name: string }[] } | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [widthTemplate, setWidthTemplate] = useState<Template | null>(null);
  const [bulkWidthOpen, setBulkWidthOpen] = useState(false);
  const [reboxedIds, setReboxedIds] = useState<string[]>([]);
  const [republishOpen, setRepublishOpen] = useState(false);
  const [sectionRun, setSectionRun] = useState<SectionReconvertRun | null>(null);
  const [sectionStatusOpen, setSectionStatusOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Template | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<Template | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [historyTarget, setHistoryTarget] = useState<Template | null>(null);

  // AI Regenerate Design state
  const [regenTarget, setRegenTarget] = useState<Template | null>(null);
  const [regenMode, setRegenMode] = useState<"full" | "variants-only">("full");
  const [regenNiche, setRegenNiche] = useState("");
  const [regenServices, setRegenServices] = useState("");
  const [regenBusiness, setRegenBusiness] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenVariants, setRegenVariants] = useState<SectionVariants>({ ...DEFAULT_VARIANTS });

  // CSV template state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvName, setCsvName] = useState("");
  // Site template state
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [siteWebsite, setSiteWebsite] = useState("");
  const [siteContentType, setSiteContentType] = useState<ContentType>("pages");
  const [sitePages, setSitePages] = useState<{ id: string; title: string; slug: string; link: string; type?: string; status?: string }[]>([]);
  const [siteLoading, setSiteLoading] = useState(false);
  // Design source for site import: keep the page's own design, or replace with a marketplace template.
  const [siteDesignSource, setSiteDesignSource] = useState<"imported" | "marketplace">("imported");
  const [siteMarketplaceId, setSiteMarketplaceId] = useState<string>("");
  const [sitePendingPage, setSitePendingPage] = useState<{ title: string; link: string; slug: string } | null>(null);
  const [siteMarketplaceCategory, setSiteMarketplaceCategory] = useState<string>("");
  const [siteLanguage, setSiteLanguage] = useState<string>("__auto__");
  // URL import loading
  const [urlImporting, setUrlImporting] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Force-refetch the templates list AND the per-account count, including
  // inactive queries (refetchType: "all"), so the UI is correct even if the
  // user navigates away and back quickly during a create/delete.
  const refreshTemplates = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["templates"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["user-template-count"], refetchType: "all" }),
      ]),
    [queryClient],
  );
  const { currentWorkspace } = useWorkspace();
  const { t } = useLanguage();
  const { features, plan } = useSubscription();
  const wsId = currentWorkspace?.id;
  const maxTemplates = features.templates;

  // Bulk reconvert + rebox all templates so every section becomes a full-width
  // main container with its content boxed to Elementor's default width (1140px).
  const reboxMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("rebox-all-templates", {
        body: { workspace_id: wsId },
      });
      if (error) throw error;
      return data as { updated: number; total: number; reboxedIds?: string[] };
    },
    onSuccess: (data) => {
      toast({
        title: "Templates updated",
        description: `Reboxed ${data.updated} of ${data.total} templates — full-width sections with 1140px boxed content.`,
      });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      const ids = data.reboxedIds ?? [];
      if (ids.length > 0) {
        setReboxedIds(ids);
        setRepublishOpen(true);
      }
    },
    onError: (e) => {
      toast({ variant: "destructive", title: "Rebox failed", description: friendlyError(e instanceof Error ? e.message : String(e)) });
    },
  });

  // Republish already-published pages whose campaigns use the just-reboxed
  // templates, so live pages pick up the new boxed layout.
  const republishMutation = useMutation({
    mutationFn: async (templateIds: string[]) => {
      if (templateIds.length === 0) return { pages: 0 };
      const { data: camps, error: campErr } = await supabase
        .from("campaigns")
        .select("id")
        .in("template_id", templateIds);
      if (campErr) throw campErr;
      const campaignIds = (camps ?? []).map((c: { id: string }) => c.id);
      if (campaignIds.length === 0) return { pages: 0 };
      const { data: pages, error: pageErr } = await supabase
        .from("generated_pages")
        .select("id")
        .in("campaign_id", campaignIds)
        .eq("status", "published");
      if (pageErr) throw pageErr;
      const pageIds = (pages ?? []).map((p: { id: string }) => p.id);
      if (pageIds.length === 0) return { pages: 0 };
      const { data, error } = await supabase.functions.invoke("publish-pages", {
        body: {
          page_ids: pageIds,
          elementor_mode: "native",
          overwrite_design: true,
        },
      });
      if (error) throw error;
      return { pages: pageIds.length, data };
    },
    onSuccess: (res) => {
      toast({
        title: res.pages > 0 ? "Republishing started" : "Nothing to republish",
        description: res.pages > 0
          ? `Republishing ${res.pages} already-published page(s) with the updated layout.`
          : "No published pages use the reboxed templates.",
      });
      setRepublishOpen(false);
    },
    onError: (e) => {
      toast({ variant: "destructive", title: "Republish failed", description: friendlyError(e instanceof Error ? e.message : String(e)) });
    },
  });

  // Reconvert ONLY the FAQ / Testimonial widgets in the selected templates'
  // existing Elementor data — every other widget and layout is kept as-is.
  const sectionReconvertMutation = useMutation({
    mutationFn: async (input: { ids: string[]; sections: string[] }) => {
      const { data, error } = await supabase.functions.invoke("reconvert-sections", {
        body: { template_ids: input.ids, sections: input.sections },
      });
      if (error) throw error;
      return data as { updated: number; total: number; updatedIds?: string[] };
    },
    onSuccess: (data) => {
      toast({
        title: "Sections reconverted",
        description: `Updated FAQ/Testimonial widgets on ${data.updated} of ${data.total} template(s). The rest of each design is unchanged.`,
      });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      const ids = data.updatedIds ?? [];
      if (ids.length > 0) {
        setReboxedIds(ids);
        setRepublishOpen(true);
      }
    },
    onError: (e) => {
      toast({ variant: "destructive", title: "Reconvert failed", description: friendlyError(e instanceof Error ? e.message : String(e)) });
    },
  });




  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("*").eq("workspace_id", wsId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
  });

  // Total templates owned by the user across ALL workspaces — the plan limit
  // is per-account, so this is what we compare against (matches the DB trigger).
  const { data: userTemplateCount = 0 } = useQuery({
    queryKey: ["user-template-count"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count } = await supabase
        .from("templates")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count ?? 0;
    },
  });

  // Plan limit state for inline messaging / disabling create actions.
  const limitReached = maxTemplates > 0 && userTemplateCount >= maxTemplates;
  const planLabel = features.label ?? plan;


  const { data: connectedWebsites = [] } = useQuery({
    queryKey: ["tpl-websites", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("websites").select("id, name, url, type, status").eq("workspace_id", wsId!).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: campaignsByTemplate = {} } = useQuery({
    queryKey: ["template-campaigns", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("id, name, template_id, campaign_type, campaign_types, website_id, status, created_at").eq("workspace_id", wsId!).not("template_id", "is", null);
      if (error) throw error;
      const map: Record<string, { count: number; campaignTypes: Set<string>; websiteIds: Set<string>; lastUsedAt: string | null }> = {};
      for (const c of data || []) {
        if (!c.template_id) continue;
        if (!map[c.template_id]) map[c.template_id] = { count: 0, campaignTypes: new Set(), websiteIds: new Set(), lastUsedAt: null };
        map[c.template_id].count++;
        if (c.campaign_type) map[c.template_id].campaignTypes.add(c.campaign_type);
        (c.campaign_types || []).forEach((t: string) => map[c.template_id!]!.campaignTypes.add(t));
        if (c.website_id) map[c.template_id].websiteIds.add(c.website_id);
        if (!map[c.template_id].lastUsedAt || c.created_at > map[c.template_id].lastUsedAt!) map[c.template_id].lastUsedAt = c.created_at;
      }
      return map;
    },
  });

  const websiteTypeMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const w of connectedWebsites) m[w.id] = w.type;
    return m;
  }, [connectedWebsites]);

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

  // ──── Filtering & Sorting ────
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!tpl.name.toLowerCase().includes(q) && !(tpl.variables || []).some(v => v.toLowerCase().includes(q))) return false;
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

  useEffect(() => { setCurrentPage(1); }, [searchQuery, siteTypeFilter, campaignTypeFilter]);

  const toggleSort = (col: "name" | "date" | "campaigns") => {
    if (sortColumn === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortColumn(col); setSortDir(col === "name" ? "asc" : "desc"); }
  };

  const sortedTemplates = useMemo(() => {
    const arr = [...filteredTemplates];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortColumn === "name") cmp = a.name.localeCompare(b.name);
      else if (sortColumn === "date") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else cmp = (campaignsByTemplate[a.id]?.count ?? 0) - (campaignsByTemplate[b.id]?.count ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filteredTemplates, sortColumn, sortDir, campaignsByTemplate]);

  const totalPages = Math.max(1, Math.ceil(sortedTemplates.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTemplates = sortedTemplates.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const SortIcon = ({ col }: { col: "name" | "date" | "campaigns" }) => {
    if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // ──── Mutations ────
  const createMutation = useMutation({
    mutationFn: async (params: { name: string; content: string; seoTitlePattern?: string; seoDescriptionPattern?: string; schemaType?: string; schemaConfig?: Record<string, any> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!wsId) throw new Error("No workspace selected");
      if (maxTemplates > 0 && userTemplateCount >= maxTemplates) throw new Error(`Plan limit: max ${maxTemplates} templates.`);
      const variables = filterDesignVars([...new Set(params.content.match(/\{[^}]+\}/g) || [])]);
      const { error } = await supabase.from("templates").insert({
        name: params.name, content: params.content, variables,
        user_id: user.id, workspace_id: wsId,
        seo_title_pattern: params.seoTitlePattern || "",
        seo_description_pattern: params.seoDescriptionPattern || "",
        schema_type: params.schemaType || "WebPage",
        schema_config: params.schemaConfig || {},
      } as any);
      if (error) throw error;
      await recordVersionForLatest(wsId, params.name, "Created template");
    },
    onSuccess: async () => {
      await refreshTemplates();
      toast({ title: "Template created" });
      setEditorOpen(false);
      setEditingTemplate(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; name: string; content: string; seoTitlePattern?: string; seoDescriptionPattern?: string; schemaType?: string; schemaConfig?: Record<string, any> }) => {
      const variables = filterDesignVars([...new Set(params.content.match(/\{[^}]+\}/g) || [])]);
      const { error } = await supabase.from("templates").update({
        name: params.name, content: params.content, variables,
        seo_title_pattern: params.seoTitlePattern || "",
        seo_description_pattern: params.seoDescriptionPattern || "",
        schema_type: params.schemaType || "WebPage",
        schema_config: params.schemaConfig || {},
      } as any).eq("id", params.id);
      if (error) throw error;
      await recordVersionById(params.id, "Edited template");
    },
    onSuccess: async () => {
      await refreshTemplates();
      toast({ title: "Template updated" });
      setEditorOpen(false);
      setEditingTemplate(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Saves only the content from the visual customizer (hero/colors/section order/skin).
  const customizeMutation = useMutation({
    mutationFn: async (params: { id: string; content: string }) => {
      const variables = filterDesignVars([...new Set(params.content.match(/\{[^}]+\}/g) || [])]);
      const { error } = await supabase.from("templates").update({
        content: params.content, variables,
      } as any).eq("id", params.id);
      if (error) throw error;
      await recordVersionById(params.id, "Customized design");
    },
    onSuccess: async () => {
      await refreshTemplates();
      toast({ title: "Template customized" });
      setCustomizeTemplate(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const renameMutation = useMutation({
    mutationFn: async (params: { id: string; name: string }) => {
      const name = params.name.trim();
      if (!name) throw new Error("Name cannot be empty");
      const { error } = await supabase.from("templates").update({ name } as any).eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshTemplates();
      toast({ title: "Template renamed" });
      setRenameTarget(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const openRename = (tpl: Template) => { setRenameTarget(tpl); setRenameValue(tpl.name); };

  const duplicateMutation = useMutation({
    mutationFn: async (tpl: Template) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");
      if (maxTemplates > 0 && userTemplateCount >= maxTemplates) throw new Error(`Plan limit: max ${maxTemplates} templates. Upgrade your plan to add more.`);
      const { error } = await supabase.from("templates").insert({
        name: `${tpl.name} (Copy)`, content: tpl.content, variables: tpl.variables,
        user_id: user.id, workspace_id: wsId,
        seo_title_pattern: (tpl as any).seo_title_pattern || "",
        seo_description_pattern: (tpl as any).seo_description_pattern || "",
        schema_type: (tpl as any).schema_type || "WebPage",
        schema_config: (tpl as any).schema_config || {},
        elementor_data: (tpl as any).elementor_data ?? null,
        template_kind: (tpl as any).template_kind || "html",
      } as any);
      if (error) throw error;
      await recordVersionForLatest(wsId, `${tpl.name} (Copy)`, "Duplicated template");
    },
    onSuccess: async () => {
      await refreshTemplates();
      toast({ title: "Template duplicated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Re-import a marketplace template at its current latest version. We always
  // create a NEW snapshot row — never mutate the existing one — so previously
  // generated campaigns remain locked to the version they were built against.
  const reimportMarketplaceMutation = useMutation({
    mutationFn: async (sourceMarketplaceId: string) => {
      const tpl = COMMUNITY_TEMPLATES.find(t => t.id === sourceMarketplaceId);
      if (!tpl) throw new Error("Marketplace template no longer exists");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");
      if (maxTemplates > 0 && userTemplateCount >= maxTemplates) throw new Error(`Plan limit: max ${maxTemplates} templates. Upgrade your plan to add more.`);
      const version = computeMarketplaceVersion(tpl);
      const { error } = await supabase.from("templates").insert({
        name: `${tpl.name} (Marketplace · ${version})`,
        content: tpl.content,
        variables: tpl.variables,
        user_id: user.id,
        workspace_id: wsId,
        seo_title_pattern: tpl.seo_title_pattern || "",
        seo_description_pattern: tpl.seo_description_pattern || "",
        schema_type: tpl.schema_type || "WebPage",
        schema_config: {},
        source_marketplace_id: tpl.id,
        source_version: version,
        source_imported_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshTemplates();
      toast({ title: "Latest version imported", description: "A new pinned snapshot was added. Existing campaigns keep their old version." });
    },
    onError: (err: Error) => toast({ title: "Re-import failed", description: err.message, variant: "destructive" }),
  });

  // ──── Actions ────
  const checkAndDelete = async (id: string) => {
    const { data: linked } = await supabase.from("campaigns").select("id, name").eq("template_id", id).limit(10);
    setDeleteTarget({ id, linkedCampaigns: linked ?? [] });
  };

  const performDelete = async (id: string, force: boolean) => {
    try {
      if (force) await supabase.from("campaigns").update({ template_id: null }).eq("template_id", id);
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
      await refreshTemplates();
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Template deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setDeleteTarget(null); }
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => { if (selectedIds.size === paginatedTemplates.length) setSelectedIds(new Set()); else setSelectedIds(new Set(paginatedTemplates.map(t => t.id))); };

  const exportTemplate = (tpl: Template) => {
    const blob = new Blob([JSON.stringify({ name: tpl.name, content: tpl.content, variables: tpl.variables, seo_title_pattern: (tpl as any).seo_title_pattern || "", seo_description_pattern: (tpl as any).seo_description_pattern || "", schema_type: (tpl as any).schema_type || "WebPage", schema_config: (tpl as any).schema_config || {}, exported_at: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${tpl.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.template.json`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported" });
  };

  const importTemplate = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");
      if (maxTemplates > 0 && userTemplateCount >= maxTemplates) throw new Error(`Plan limit: max ${maxTemplates} templates. Upgrade your plan to add more.`);

      let data: any;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error("Failed to parse file: please ensure it is valid JSON.");
      }



      if (!data.name || !data.content) throw new Error("Invalid template file.");
      const { error } = await supabase.from("templates").insert({ name: data.name, content: data.content, variables: data.variables || [], user_id: user.id, workspace_id: wsId, seo_title_pattern: data.seo_title_pattern || "", seo_description_pattern: data.seo_description_pattern || "", schema_type: data.schema_type || "WebPage", schema_config: data.schema_config || {} } as any);
      if (error) throw error;
      await refreshTemplates();
      toast({ title: "Template imported" });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    }
    if (importFileRef.current) importFileRef.current.value = "";
  };

  const bulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await supabase.from("campaigns").update({ template_id: null }).eq("template_id", id);
        await supabase.from("templates").delete().eq("id", id);
      }
      await refreshTemplates();
      toast({ title: `${selectedIds.size} template(s) deleted` });
      setSelectedIds(new Set());
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setBulkDeleteOpen(false); }
  };

  // ──── AI Regenerate Design ────
  const openRegenDialog = (tpl: Template, mode: "full" | "variants-only" = "full") => {
    setRegenTarget(tpl);
    setRegenMode(mode);
    setRegenNiche("");
    setRegenServices("");
    setRegenBusiness("");
    setRegenVariants({ ...DEFAULT_VARIANTS });
  };

  const runRegenDesign = async () => {
    if (!regenTarget) return;
    if (regenMode === "full" && !regenNiche.trim()) {
      toast({ title: "Niche required", description: "Tell the AI what niche this template targets.", variant: "destructive" });
      return;
    }
    setRegenLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-template-design", {
        body: {
          content: regenTarget.content,
          mode: regenMode,
          niche: regenNiche.trim(),
          services: regenServices.trim(),
          business: regenBusiness.trim(),
          variants: regenVariants,
        },
      });
      if (error) throw new Error(friendlyError(error));
      const newContent: string = data?.content;
      if (!newContent) throw new Error("AI returned no content");
      const variables = filterDesignVars([...new Set(newContent.match(/\{[^}]+\}/g) || [])]);
      const { error: upErr } = await supabase.from("templates").update({
        content: newContent,
        variables,
      } as any).eq("id", regenTarget.id);
      if (upErr) throw upErr;
      await refreshTemplates();
      toast({
        title: regenMode === "variants-only" ? "Layout updated" : "Design regenerated",
        description: data?.summary || (regenMode === "variants-only" ? `Variants: ${summarizeVariants(regenVariants)}` : `New design applied for ${regenNiche}.`),
      });
      setRegenTarget(null);
    } catch (err: any) {
      toast({ title: regenMode === "variants-only" ? "Layout update failed" : "Regeneration failed", description: err.message, variant: "destructive" });
    } finally {
      setRegenLoading(false);
    }
  };


  const createFromCsv = () => {
    if (!csvText.trim()) return;
    const lines = csvText.split("\n").filter(l => l.trim());
    const headers = lines[0].split(",").map(h => h.trim()).filter(Boolean);
    if (headers.length === 0) { toast({ title: "No headers found", variant: "destructive" }); return; }
    const varHtml = headers.map(h => {
      const varName = h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      return `<div class="mb-4"><h3>${h}</h3><p>{${varName}}</p></div>`;
    }).join("\n");
    const tplContent = `<div class="template"><h1>{${headers[0].toLowerCase().replace(/[^a-z0-9]+/g, "_")}}</h1>\n${varHtml}</div>`;
    setCsvDialogOpen(false);
    setCsvText(""); setCsvName("");
    // Open editor with this content
    setEditingTemplate({ id: "", name: csvName || "CSV Template", content: tplContent, variables: [], user_id: "", created_at: "", updated_at: "", workspace_id: wsId || null, schema_type: "WebPage", schema_config: {}, seo_title_pattern: "", seo_description_pattern: "" } as any);
    setEditorOpen(true);
    toast({ title: `Template created with ${headers.length} variables` });
  };

  const loadSitePages = async (websiteId: string, type: ContentType = "pages") => {
    setSiteLoading(true); setSitePages([]);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-site-content", {
        body: { website_id: websiteId, content_type: type === "services" ? "pages" : type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const items = (data?.items || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        link: item.url,
        type: item.type || type,
        status: item.status,
      }));
      setSitePages(items);
      if (items.length === 0) {
        toast({ title: `No ${type} found`, description: "Try a different content type or check your website connection.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: `Failed to load ${type}`, description: err.message, variant: "destructive" });
    } finally { setSiteLoading(false); }
  };

  const fetchPageViaIframe = (pageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1280px;height:800px;opacity:0;pointer-events:none;";
      iframe.sandbox.add("allow-scripts", "allow-same-origin");
      
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Timeout loading page"));
      }, 15000);

      const cleanup = () => {
        clearTimeout(timeout);
        try { document.body.removeChild(iframe); } catch {}
      };

      iframe.onload = () => {
        setTimeout(() => {
          try {
            const doc = iframe.contentDocument;
            if (!doc) { cleanup(); reject(new Error("Cannot access page content")); return; }
            resolve(doc.documentElement.outerHTML);
          } catch {
            cleanup();
            reject(new Error("Cross-origin page"));
          } finally {
            cleanup();
          }
        }, 3000);
      };

      iframe.onerror = () => { cleanup(); reject(new Error("Failed to load")); };
      document.body.appendChild(iframe);
      iframe.src = pageUrl;
    });
  };

  const importSitePage = async (pageUrl: string, pageTitle: string) => {
    setUrlImporting(true);
    try {
      // First attempt: server-side fetch
      const { data, error } = await supabase.functions.invoke("scan-template", { body: { url: pageUrl } });
      if (error) throw error;

      // If SPA detected, try client-side capture and retry
      if (data?.spa_detected) {
        toast({ title: "JavaScript page detected", description: "Attempting browser-based capture..." });
        
        let clientHtml: string | null = null;
        try {
          clientHtml = await fetchPageViaIframe(pageUrl);
        } catch {
          // Cross-origin expected for most sites
        }

        if (clientHtml && clientHtml.length > 200) {
          const { data: retryData, error: retryError } = await supabase.functions.invoke("scan-template", {
            body: { url: pageUrl, client_html: clientHtml },
          });
          if (retryError) throw retryError;
          if (retryData?.bodyHtml) {
            return processImportResult(retryData, pageTitle);
          }
        }

        // If capture failed, still use whatever we got but warn user
        if (!data?.bodyHtml || data.bodyHtml.replace(/<[^>]*>/g, "").trim().length < 50) {
          toast({ 
            title: "Limited import", 
            description: "This site uses JavaScript rendering. Try pasting the page source in 'Design Your Own' instead.",
            variant: "destructive" 
          });
          return;
        }
      }

      processImportResult(data, pageTitle);
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setUrlImporting(false);
    }
  };

  const processImportResult = (data: any, pageTitle: string) => {
    let html = data?.bodyHtml || "";
    const styles = data?.headStyles || "";
    const suggestions: { blockId: string; original: string; variable: string; value: string }[] = data?.suggestions || [];

    // Strip common header/footer/nav elements
    html = html.replace(/<header[\s\S]*?<\/header>/gi, "");
    html = html.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    html = html.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    html = html.replace(/<!--\s*header\s*-->[\s\S]*?<!--\s*\/header\s*-->/gi, "");
    html = html.replace(/<!--\s*footer\s*-->[\s\S]*?<!--\s*\/footer\s*-->/gi, "");

    // Prefer the AI's curated "best keyword" suggestions. These are clean,
    // business-specific variable names (city, service, product_name, ...).
    const suggestedVariableEntries: { name: string; original: string; values: string[] }[] = [];
    const seenNames = new Set<string>();
    for (const s of suggestions) {
      if (s.original && s.variable && html.includes(s.original)) {
        const name = s.variable.replace(/[{}]/g, "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "");
        // Skip empty/duplicate names and overly long "sentence" originals that
        // are clearly body copy rather than a keyword value.
        if (!name || seenNames.has(name)) continue;
        if (s.original.trim().split(/\s+/).length > 8) continue;
        seenNames.add(name);
        suggestedVariableEntries.push({ name, original: s.original, values: [s.original] });
      }
    }

    // Only fall back to deterministic text extraction when the AI returned NO
    // usable keywords — otherwise we'd pollute the list with full sentences.
    const fallbackVariableEntries =
      suggestedVariableEntries.length > 0
        ? []
        : autoExtractTemplateVariables(html, pageTitle, pendingKeywords);
    const variableEntries = [...suggestedVariableEntries, ...fallbackVariableEntries].slice(0, 16);
    html = applyTemplateVariables(html, variableEntries);

    const allVars = filterDesignVars([...new Set([...variableEntries.map((v) => v.name), ...pendingKeywords])]);
    const fullContent = styles ? `<!-- STYLES -->\n${styles}\n<!-- /STYLES -->\n${html}` : html;
    setSiteDialogOpen(false); setSitePages([]);
    setEditingTemplate({ id: "", name: pageTitle || "Site Template", content: fullContent, variables: allVars, user_id: "", created_at: "", updated_at: "", workspace_id: wsId || null, schema_type: "WebPage", schema_config: { language: siteLanguage !== "__auto__" ? siteLanguage : undefined }, seo_title_pattern: "", seo_description_pattern: "" } as any);
    setEditorOpen(true);
    const varMsg = allVars.length > 0 ? ` — ${allVars.length} keywords detected: {${allVars.join("}, {")}}` : "";
    toast({ title: `Page imported as template${varMsg}` });
  };

  // Translate SEO patterns into the chosen language while keeping {placeholders}
  // intact. Returns the originals unchanged on any failure / auto-detect.
  const localizeSeoPatterns = async (
    language: string,
    fields: { title: string; description: string; slug: string },
  ): Promise<{ title: string; description: string; slug: string }> => {
    if (!language || language === "__auto__") return fields;
    try {
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: {
          prompt: `Translate the following SEO field patterns into ${language}.
Rules:
- Keep every {placeholder} token EXACTLY as-is (do not translate or alter text inside braces).
- Translate only the surrounding static words.
- For "slug": output lowercase, hyphen-separated, ASCII-safe, keep {placeholders}.
- Return ONLY valid JSON: {"title": "...", "description": "...", "slug": "..."}

title: ${fields.title}
description: ${fields.description}
slug: ${fields.slug}`,
        },
      });
      if (error) throw error;
      const raw = (data?.content || "").replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      const parsed = JSON.parse(raw);
      return {
        title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : fields.title,
        description: typeof parsed.description === "string" && parsed.description.trim() ? parsed.description.trim() : fields.description,
        slug: typeof parsed.slug === "string" && parsed.slug.trim() ? parsed.slug.trim() : fields.slug,
      };
    } catch {
      return fields;
    }
  };

  // Replace a connected-site page's design with a full marketplace template
  // (content + variables + SEO patterns), keeping the page name for context.
  const applyMarketplaceToSitePage = async (pageTitle: string) => {
    const tpl = COMMUNITY_TEMPLATES.find(t => t.id === siteMarketplaceId);
    if (!tpl) {
      toast({ title: "Pick a template first", variant: "destructive" });
      return;
    }
    setSiteDialogOpen(false);
    setSitePages([]);

    const lang = siteLanguage !== "__auto__" ? siteLanguage : "";
    const localized = await localizeSeoPatterns(lang, {
      title: tpl.seo_title_pattern || "",
      description: tpl.seo_description_pattern || "",
      slug: tpl.slug_pattern || "",
    });

    setEditingTemplate({
      id: "",
      name: pageTitle || tpl.name,
      content: tpl.content,
      variables: tpl.variables || [],
      user_id: "",
      created_at: "",
      updated_at: "",
      workspace_id: wsId || null,
      schema_type: tpl.schema_type || "WebPage",
      schema_config: { source_marketplace_id: tpl.id, language: lang || undefined, slug_pattern: localized.slug || undefined } as any,
      seo_title_pattern: localized.title,
      seo_description_pattern: localized.description,
    } as any);
    setEditorOpen(true);
    toast({ title: `"${tpl.name}" applied${lang ? ` — localized to ${lang}` : ""}` });
  };




  const handleEditorSave = (data: { name: string; content: string; seoTitlePattern: string; seoDescriptionPattern: string; schemaType: string; schemaConfig: Record<string, any> }) => {
    if (editingTemplate?.id) {
      updateMutation.mutate({ id: editingTemplate.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditor = (tpl?: Template) => {
    if (tpl) {
      setEditingTemplate(tpl);
    } else {
      setEditingTemplate(null);
    }
    setEditorOpen(true);
  };

  const openPreview = (tpl: Template) => {
    setPreviewTemplateRow(tpl);
    setPreviewTemplate({
      name: tpl.name,
      content: tpl.content,
      variables: (tpl.variables as string[]) || [],
      seo_title_pattern: (tpl as any).seo_title_pattern || "",
      seo_description_pattern: (tpl as any).seo_description_pattern || "",
      elementor_data: (tpl as any).elementor_data ?? null,
      template_kind: (tpl as any).template_kind || null,
      source: (tpl as any).source_marketplace_id ? "Marketplace snapshot" : "Workspace template",
    });
  };

  const handlePickerSelect = (method: CreationMethod, config: { selectedKeywords: string[]; targetUrl?: string; selectedWebsite?: any; contentType?: ContentType; platform?: "wordpress" | "shopify" | "prestashop" | "generic"; designSource?: "imported" | "marketplace"; marketplaceId?: string }) => {
    setPendingKeywords(config.selectedKeywords);
    setPickerOpen(false);

    if (method === "ai") {
      setAiOpen(true);
    } else if (method === "url" && config.targetUrl) {
      // Same step flow as connected-site: choose design source + language first.
      setSiteWebsite("");
      setSitePages([]);
      setSiteDesignSource("imported");
      setSiteMarketplaceId("");
      setSiteMarketplaceCategory("");
      setSiteLanguage("__auto__");
      setSitePendingPage({ title: "Imported Template", link: config.targetUrl, slug: "" });
      setSiteDialogOpen(true);
    } else if (method === "website" && config.selectedWebsite) {
      const ct = config.contentType || "pages";
      setSiteWebsite(config.selectedWebsite.id);
      setSiteContentType(ct);
      setSiteDesignSource(config.designSource || "imported");
      setSiteMarketplaceId(config.marketplaceId || "");
      loadSitePages(config.selectedWebsite.id, ct);
      setSiteDialogOpen(true);
    } else {
      // Design your own — build platform-specific scaffold
      const platform = config.platform || "wordpress";
      const kws = config.selectedKeywords;
      const kwBlocks = kws.map(k => `<p>{${k}}</p>`).join("\n      ");

      let scaffold = "";
      if (platform === "wordpress") {
        scaffold = `<section class="pgp-section">
  <div class="pgp-container">
    <h1>{title}</h1>
    ${kwBlocks || "<p>Edit this content.</p>"}
    <a class="pgp-button" href="#">Get Started</a>
  </div>
</section>`;
      } else if (platform === "shopify") {
        scaffold = `<div class="page-width">
  <div class="rich-text">
    <h1 class="rich-text__heading">{title}</h1>
    <div class="rich-text__text">
      ${kwBlocks || "<p>Edit this content in your Shopify theme editor.</p>"}
    </div>
    <a href="#" class="button button--primary">Shop Now</a>
  </div>
</div>`;
      } else if (platform === "prestashop") {
        scaffold = `<section class="page-content card card-block">
  <div class="container">
    <div class="row">
      <div class="col-md-12">
        <h1 class="page-title h1">{title}</h1>
        ${kwBlocks || "<p>Edit this content in PrestaShop's TinyMCE editor.</p>"}
        <a href="#" class="btn btn-primary">Discover More</a>
      </div>
    </div>
  </div>
</section>`;
      } else {
        scaffold = `<div class="template">
  <h1>{title}</h1>
  ${kwBlocks}
</div>`;
      }

      setEditingTemplate({
        id: "",
        name: "New Template",
        content: scaffold,
        variables: kws,
        user_id: "",
        created_at: "",
        updated_at: "",
        workspace_id: wsId || null,
        schema_type: "WebPage",
        schema_config: { _platform: platform } as any,
        seo_title_pattern: "",
        seo_description_pattern: "",
      } as any);
      setEditorOpen(true);
    }
  };

  // ──── Render ────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-display">{t("templates.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("templates.description")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importTemplate(f); }} />
          <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()} disabled={limitReached}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> {t("templates.importJson")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reboxMutation.mutate()}
            disabled={reboxMutation.isPending || templates.length === 0}
          >
            {reboxMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Columns className="mr-1.5 h-3.5 w-3.5" />
            )}
            Rebox all
          </Button>

          <Button size="sm" onClick={() => setPickerOpen(true)} disabled={limitReached}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> {t("templates.createTemplate")}
          </Button>
        </div>
      </div>

      {/* Plan limit reached — inline error */}
      {limitReached && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Template limit reached</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Your <strong>{planLabel}</strong> plan allows{" "}
              <strong>{maxTemplates} template{maxTemplates === 1 ? "" : "s"}</strong>{" "}
              and you've used <strong>{userTemplateCount}</strong>. Delete an existing
              template or upgrade your plan to create more.
            </span>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to="/billing"><Crown className="mr-1.5 h-3.5 w-3.5" /> Upgrade plan</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}


      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("common.searchTemplates")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={siteTypeFilter} onValueChange={setSiteTypeFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder={t("common.allPlatforms")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allPlatforms")}</SelectItem>
            <SelectItem value="wordpress">WordPress</SelectItem>
            <SelectItem value="shopify">Shopify</SelectItem>
            <SelectItem value="prestashop">
              <span className="flex items-center gap-2">
                PrestaShop
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-amber-500/10 text-amber-500 border-amber-500/20">Soon</Badge>
              </span>
            </SelectItem>
            <SelectItem value="woocommerce">WooCommerce</SelectItem>
          </SelectContent>
        </Select>
        <Select value={campaignTypeFilter} onValueChange={setCampaignTypeFilter}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder={t("common.allTypes")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.allTypes")}</SelectItem>
            <SelectItem value="seo">SEO</SelectItem>
            <SelectItem value="sea">SEA</SelectItem>
            <SelectItem value="geo">GEO</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1 border rounded-md p-0.5">
          <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
          <Button variant={viewMode === "cards" ? "secondary" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setViewMode("cards")}><LayoutGrid className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={() => { [...selectedIds].forEach(id => { const t = templates.find(t => t.id === id); if (t) exportTemplate(t); }); }}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkWidthOpen(true)}>
            <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" /> Content width
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={sectionReconvertMutation.isPending}>
                {sectionReconvertMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                Reconvert sections
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={() => sectionReconvertMutation.mutate({ ids: [...selectedIds], sections: ["faq", "testimonial"] })}>
                FAQ + Testimonials
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sectionReconvertMutation.mutate({ ids: [...selectedIds], sections: ["faq"] })}>
                FAQ only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sectionReconvertMutation.mutate({ ids: [...selectedIds], sections: ["testimonial"] })}>
                Testimonials only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="shadow-surface">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold mb-1">{templates.length === 0 ? "No templates yet" : "No matching templates"}</h3>
            <p className="text-sm text-muted-foreground mb-4">{templates.length === 0 ? "Create your first template to start generating pages." : "Try adjusting your filters."}</p>
            {templates.length === 0 && (
              <div className="flex justify-center gap-2">
                <Button onClick={() => setPickerOpen(true)} disabled={limitReached}><Plus className="mr-2 h-4 w-4" /> Create Template</Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <Card className="shadow-surface overflow-hidden">
          {/* Mobile: Card layout */}
          <div className="lg:hidden divide-y divide-border">
            {paginatedTemplates.map((tpl) => {
              const info = campaignsByTemplate[tpl.id];
              const siteTypes = templateSiteTypes[tpl.id];
              const contentVars = filterDesignVars(tpl.variables || []);
              return (
                <div key={tpl.id} className={`p-3 flex items-start gap-3 ${selectedIds.has(tpl.id) ? "bg-primary/5" : "hover:bg-muted/50"} transition-colors`}>
                  <Checkbox checked={selectedIds.has(tpl.id)} onCheckedChange={() => toggleSelect(tpl.id)} className="mt-1 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-sm truncate">{tpl.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {siteTypes && [...siteTypes].map(st => <Badge key={st} variant="outline" className="text-[10px] capitalize">{st}</Badge>)}
                      <TemplateVersionBadge template={tpl as any} onReimport={(id) => reimportMarketplaceMutation.mutate(id)} />
                      <span className="text-[10px] text-muted-foreground">{contentVars.length} vars</span>
                      <span className="text-[10px] text-muted-foreground">{info?.count ?? 0} campaigns</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Updated {new Date(tpl.updated_at).toLocaleDateString()}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => openPreview(tpl)}><Eye className="h-3.5 w-3.5 mr-2" /> Preview</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditor(tpl)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRename(tpl)}><Pencil className="h-3.5 w-3.5 mr-2" /> Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setHistoryTarget(tpl)}><History className="h-3.5 w-3.5 mr-2" /> Version history</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setCustomizeTemplate(tpl)}><Palette className="h-3.5 w-3.5 mr-2" /> Customize</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openRegenDialog(tpl)}><Wand2 className="h-3.5 w-3.5 mr-2" /> Regenerate Design</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openRegenDialog(tpl, "variants-only")}><LayoutGrid className="h-3.5 w-3.5 mr-2" /> Layout Variants</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setWidthTemplate(tpl)}><LayoutTemplate className="h-3.5 w-3.5 mr-2" /> Content width</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDuplicateTarget(tpl)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadStarterCsv({ templateName: tpl.name, variables: (tpl.variables as string[]) || [] })}><FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Download CSV starter</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportTemplate(tpl)}><Download className="h-3.5 w-3.5 mr-2" /> Export</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => checkAndDelete(tpl.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>

          {/* Desktop: Table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={paginatedTemplates.length > 0 && selectedIds.size === paginatedTemplates.length} onCheckedChange={toggleSelectAll} /></TableHead>
                  <TableHead className="w-[35%]"><button className="flex items-center hover:text-foreground" onClick={() => toggleSort("name")}>{t("common.name")} <SortIcon col="name" /></button></TableHead>
                  <TableHead className="w-[12%]">{t("templates.colPlatform")}</TableHead>
                  <TableHead className="w-[8%]">{t("templates.colVariables")}</TableHead>
                  <TableHead className="w-[10%]"><button className="flex items-center hover:text-foreground" onClick={() => toggleSort("campaigns")}>{t("templates.colCampaigns")} <SortIcon col="campaigns" /></button></TableHead>
                  <TableHead className="w-[12%]"><button className="flex items-center hover:text-foreground" onClick={() => toggleSort("date")}>{t("templates.colUpdated")} <SortIcon col="date" /></button></TableHead>
                  <TableHead className="text-right w-10">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTemplates.map((tpl) => {
                  const info = campaignsByTemplate[tpl.id];
                  const siteTypes = templateSiteTypes[tpl.id];
                  const contentVars = filterDesignVars(tpl.variables || []);
                  return (
                    <TableRow key={tpl.id} className={selectedIds.has(tpl.id) ? "bg-primary/5" : ""}>
                      <TableCell><Checkbox checked={selectedIds.has(tpl.id)} onCheckedChange={() => toggleSelect(tpl.id)} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium truncate cursor-pointer hover:text-primary" onClick={() => openEditor(tpl)}>{tpl.name}</span>
                          <TemplateVersionBadge template={tpl as any} onReimport={(id) => reimportMarketplaceMutation.mutate(id)} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {siteTypes && [...siteTypes].map(st => <Badge key={st} variant="outline" className="text-[10px] capitalize">{st}</Badge>)}
                          {(!siteTypes || siteTypes.size === 0) && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell><span className="text-sm tabular-nums">{contentVars.length}</span></TableCell>
                      <TableCell><span className="text-sm tabular-nums">{info?.count ?? 0}</span></TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{new Date(tpl.updated_at).toLocaleDateString()}</span></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openPreview(tpl)}><Eye className="h-3.5 w-3.5 mr-2" /> Preview</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditor(tpl)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRename(tpl)}><Pencil className="h-3.5 w-3.5 mr-2" /> Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setHistoryTarget(tpl)}><History className="h-3.5 w-3.5 mr-2" /> Version history</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCustomizeTemplate(tpl)}><Palette className="h-3.5 w-3.5 mr-2" /> Customize</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRegenDialog(tpl)}><Wand2 className="h-3.5 w-3.5 mr-2" /> Regenerate Design</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRegenDialog(tpl, "variants-only")}><LayoutGrid className="h-3.5 w-3.5 mr-2" /> Layout Variants</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setWidthTemplate(tpl)}><LayoutTemplate className="h-3.5 w-3.5 mr-2" /> Content width</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDuplicateTarget(tpl)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadStarterCsv({ templateName: tpl.name, variables: (tpl.variables as string[]) || [] })}><FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Download CSV starter</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportTemplate(tpl)}><Download className="h-3.5 w-3.5 mr-2" /> Export</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => checkAndDelete(tpl.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedTemplates.length)} of {sortedTemplates.length}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pn = totalPages <= 5 ? i + 1 : safePage <= 3 ? i + 1 : safePage >= totalPages - 2 ? totalPages - 4 + i : safePage - 2 + i;
                  return <Button key={pn} variant={pn === safePage ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs" onClick={() => setCurrentPage(pn)}>{pn}</Button>;
                })}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        /* Card view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedTemplates.map((tpl) => {
            const info = campaignsByTemplate[tpl.id];
            const siteTypes = templateSiteTypes[tpl.id];
            const contentVars = filterDesignVars(tpl.variables || []);
            return (
              <Card key={tpl.id} className="shadow-surface hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openEditor(tpl)}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-sm truncate">{tpl.name}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}><Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPreview(tpl); }}><Eye className="h-3.5 w-3.5 mr-2" /> Preview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditor(tpl)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRename(tpl)}><Pencil className="h-3.5 w-3.5 mr-2" /> Rename</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setHistoryTarget(tpl)}><History className="h-3.5 w-3.5 mr-2" /> Version history</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCustomizeTemplate(tpl); }}><Palette className="h-3.5 w-3.5 mr-2" /> Customize</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRegenDialog(tpl); }}><Wand2 className="h-3.5 w-3.5 mr-2" /> Regenerate Design</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRegenDialog(tpl, "variants-only"); }}><LayoutGrid className="h-3.5 w-3.5 mr-2" /> Layout Variants</DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setWidthTemplate(tpl); }}><LayoutTemplate className="h-3.5 w-3.5 mr-2" /> Content width</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDuplicateTarget(tpl)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadStarterCsv({ templateName: tpl.name, variables: (tpl.variables as string[]) || [] })}><FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Download CSV starter</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportTemplate(tpl)}><Download className="h-3.5 w-3.5 mr-2" /> Export</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => checkAndDelete(tpl.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {siteTypes && [...siteTypes].map(st => <Badge key={st} variant="outline" className="text-[10px] capitalize">{st}</Badge>)}
                    <TemplateVersionBadge template={tpl as any} onReimport={(id) => reimportMarketplaceMutation.mutate(id)} />
                    {contentVars.slice(0, 4).map(v => <Badge key={v} variant="secondary" className="text-[10px] font-mono">{v}</Badge>)}
                    {contentVars.length > 4 && <Badge variant="secondary" className="text-[10px]">+{contentVars.length - 4}</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{info?.count ?? 0} campaigns</span>
                    <span>Updated {new Date(tpl.updated_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ──── Dialogs ──── */}
      <AiTemplateBuilderDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        onSave={(name, content, schemaConfig) => createMutation.mutate({ name, content, schemaConfig })}
        isSaving={createMutation.isPending}
        onContentGenerated={(data) => {
          setEditingTemplate({ id: "", name: data.name, content: data.content, variables: data.variables || [], user_id: "", created_at: "", updated_at: "", workspace_id: wsId || null, schema_type: "WebPage", schema_config: {}, seo_title_pattern: data.seoTitle || "", seo_description_pattern: data.seoDescription || "" } as any);
          setEditorOpen(true);
        }}
      />

      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={(v) => { if (!v) { setEditorOpen(false); setEditingTemplate(null); } else setEditorOpen(true); }}
        editingTemplate={editingTemplate}
        onSave={handleEditorSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {customizeTemplate && (
        <TemplateCustomizerDialog
          open={!!customizeTemplate}
          onOpenChange={(v) => { if (!v) setCustomizeTemplate(null); }}
          templateName={customizeTemplate.name}
          content={customizeTemplate.content}
          isPending={customizeMutation.isPending}
          onSave={(content) => customizeMutation.mutate({ id: customizeTemplate.id, content })}
        />
      )}



      <TemplatePreviewDialog
        open={!!previewTemplate}
        onOpenChange={(v) => { if (!v) { setPreviewTemplate(null); setPreviewTemplateRow(null); } }}
        template={previewTemplate}
        primaryAction={previewTemplateRow ? {
          label: "Edit template",
          onClick: () => { const t = previewTemplateRow; setPreviewTemplate(null); setPreviewTemplateRow(null); openEditor(t); },
        } : undefined}
      />

      {/* Version History Dialog */}
      <TemplateVersionHistoryDialog
        open={!!historyTarget}
        onOpenChange={(v) => { if (!v) setHistoryTarget(null); }}
        templateId={historyTarget?.id ?? null}
        templateName={historyTarget?.name}
      />

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(v) => { if (!v) setRenameTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Rename template</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-input">Template name</Label>
            <Input
              id="rename-input"
              value={renameValue}
              autoFocus
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && renameTarget && renameValue.trim()) renameMutation.mutate({ id: renameTarget.id, name: renameValue }); }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button
              disabled={!renameValue.trim() || renameMutation.isPending}
              onClick={() => renameTarget && renameMutation.mutate({ id: renameTarget.id, name: renameValue })}
            >
              {renameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Dialog */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create from CSV Headers</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input value={csvName} onChange={(e) => setCsvName(e.target.value)} placeholder="My CSV Template" />
            </div>
            <div className="space-y-1.5">
              <Label>Paste CSV content</Label>
              <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="name,city,price,description" rows={6} className="font-mono text-xs" />
            </div>
            <Button onClick={createFromCsv} disabled={!csvText.trim()} className="w-full">Create Template</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Site Import Dialog */}
      <Dialog open={siteDialogOpen} onOpenChange={(v) => { setSiteDialogOpen(v); if (!v) setSitePendingPage(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5" />
              Import from Connected Site
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Website selector */}
            <Select value={siteWebsite} onValueChange={(v) => { setSiteWebsite(v); setSitePendingPage(null); loadSitePages(v, siteContentType); }}>
              <SelectTrigger><SelectValue placeholder="Select website" /></SelectTrigger>
              <SelectContent>
                {connectedWebsites.map(w => <SelectItem key={w.id} value={w.id}>{w.name} ({w.type})</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Content type tabs */}
            {siteWebsite && (
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                {(["pages", "products", "services"] as ContentType[]).map(ct => (
                  <button
                    key={ct}
                    onClick={() => { setSiteContentType(ct); setSitePendingPage(null); loadSitePages(siteWebsite, ct); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      siteContentType === ct
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ct === "pages" && <FileText className="h-3.5 w-3.5" />}
                    {ct === "products" && <ShoppingBag className="h-3.5 w-3.5" />}
                    {ct === "services" && <Briefcase className="h-3.5 w-3.5" />}
                    {ct.charAt(0).toUpperCase() + ct.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {/* Loading */}
            {siteLoading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading {siteContentType}...</p>
              </div>
            )}

            {/* Step 1: pick a page (only until one is selected) */}
            {!siteLoading && sitePages.length > 0 && !sitePendingPage && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{sitePages.length} {siteContentType} found — click a page to continue</p>
                <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-1">
                  {sitePages.map(p => (
                    <button key={p.id || p.link} onClick={() => setSitePendingPage({ title: p.title, link: p.link, slug: p.slug })} className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors group">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-sm block truncate">{p.title}</span>
                          <span className="text-xs text-muted-foreground block truncate">/{p.slug}</span>
                        </div>
                        {p.status && (
                          <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                            {p.status}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: chosen page → pick design source */}
            {sitePendingPage && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div className="min-w-0">
                    <span className="text-xs text-muted-foreground">Selected page</span>
                    <span className="font-medium text-sm block truncate">{sitePendingPage.title}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSitePendingPage(null)}>Change</Button>
                </div>

                <p className="text-xs font-semibold">How should the new pages look?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSiteDesignSource("imported")}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      siteDesignSource === "imported" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-xs font-semibold block">Keep existing design</span>
                    <span className="text-[10px] text-muted-foreground">Only update SEO & content</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSiteDesignSource("marketplace")}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      siteDesignSource === "marketplace" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-xs font-semibold block">Use marketplace template</span>
                    <span className="text-[10px] text-muted-foreground">Replace design with a marketplace one</span>
                  </button>
                </div>
                {siteDesignSource === "marketplace" && (() => {
                  const type = connectedWebsites.find(w => w.id === siteWebsite)?.type;
                  const platformOk = (t: typeof COMMUNITY_TEMPLATES[number]) => {
                    if (!type) return true;
                    if (type === "woocommerce") return t.platform === "wordpress" || t.platform === "generic";
                    return t.platform === type || t.platform === "generic";
                  };
                  const available = COMMUNITY_TEMPLATES.filter(platformOk);
                  const categories = Array.from(new Set(available.map(t => t.category))).sort();
                  const inCategory = siteMarketplaceCategory
                    ? available.filter(t => t.category === siteMarketplaceCategory)
                    : [];
                  return (
                    <div className="space-y-2">
                      <Select value={siteMarketplaceCategory} onValueChange={(v) => { setSiteMarketplaceCategory(v); setSiteMarketplaceId(""); }}>
                        <SelectTrigger><SelectValue placeholder="Choose a category..." /></SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {siteMarketplaceCategory && (
                        <Select value={siteMarketplaceId} onValueChange={setSiteMarketplaceId}>
                          <SelectTrigger><SelectValue placeholder="Choose marketplace template..." /></SelectTrigger>
                          <SelectContent>
                            {inCategory.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  );
                })()}

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">Content language</p>
                  <Select value={siteLanguage} onValueChange={setSiteLanguage}>
                    <SelectTrigger><SelectValue placeholder="Choose language..." /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {SITE_LANGUAGE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">All SEO titles, descriptions & content will be generated in this language.</p>
                </div>


                <Button
                  className="w-full"
                  disabled={siteDesignSource === "marketplace" && !siteMarketplaceId}
                  onClick={() => {
                    const page = sitePendingPage;
                    if (!page) return;
                    if (siteDesignSource === "marketplace") {
                      applyMarketplaceToSitePage(page.title);
                    } else {
                      importSitePage(page.link, page.title);
                    }
                    setSitePendingPage(null);
                  }}
                >
                  {siteDesignSource === "marketplace" ? "Apply marketplace design" : "Continue with existing design"}
                </Button>
              </div>
            )}


            {/* Empty state */}
            {!siteLoading && sitePages.length === 0 && siteWebsite && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No {siteContentType} found</p>
                <p className="text-xs mt-1">Try a different content type or check your site connection.</p>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg p-2.5">
              💡 Headers, footers, and navigation are automatically removed. Only the main content is imported to keep your template clean.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Regenerate Design + Layout Variants */}
      <Dialog open={!!regenTarget} onOpenChange={(o) => { if (!o && !regenLoading) setRegenTarget(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[88dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {regenMode === "variants-only"
                ? (<><LayoutGrid className="h-4 w-4 text-primary" /> Layout Variants</>)
                : (<><Wand2 className="h-4 w-4 text-primary" /> Regenerate Design</>)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {regenMode === "variants-only"
                ? <>Pick AI-vibe section layouts for <span className="font-medium text-foreground">{regenTarget?.name}</span>. Instant, no AI cost — your styles and content stay intact.</>
                : <>AI will rewrite the visual style of <span className="font-medium text-foreground">{regenTarget?.name}</span> to feel modern and tailored to your niche. Variables and HTML structure stay intact.</>}
            </p>

            {regenMode === "full" && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <div className="space-y-1">
                  <Label htmlFor="regen-niche" className="text-xs">Target niche <span className="text-destructive">*</span></Label>
                  <Input id="regen-niche" placeholder="e.g. dental clinic, law firm, SaaS, restaurant" value={regenNiche} onChange={(e) => setRegenNiche(e.target.value)} disabled={regenLoading} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regen-services" className="text-xs">Services / products (optional)</Label>
                  <Input id="regen-services" placeholder="e.g. teeth whitening, implants" value={regenServices} onChange={(e) => setRegenServices(e.target.value)} disabled={regenLoading} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="regen-business" className="text-xs">Business name (optional)</Label>
                  <Input id="regen-business" placeholder="e.g. BrightSmile Dental" value={regenBusiness} onChange={(e) => setRegenBusiness(e.target.value)} disabled={regenLoading} />
                </div>
              </div>
            )}

            {/* ─── Section variant pickers ─── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section layouts</Label>
                <button type="button" className="text-[10px] text-primary hover:underline disabled:opacity-50" disabled={regenLoading} onClick={() => setRegenVariants({ ...DEFAULT_VARIANTS })}>Reset</button>
              </div>

              {[
                { key: "hero" as const, label: "Hero",  options: HERO_VARIANTS },
                { key: "grid" as const, label: "Grid",  options: GRID_VARIANTS },
                { key: "cta"  as const, label: "CTA",   options: CTA_VARIANTS },
                { key: "faq"  as const, label: "FAQ",   options: FAQ_VARIANTS },
              ].map(({ key, label, options }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {options.map(opt => {
                      const active = (regenVariants as any)[key] === opt.value;
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          disabled={regenLoading}
                          onClick={() => setRegenVariants(v => ({ ...v, [key]: opt.value as any }))}
                          title={opt.hint}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${active ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted"} disabled:opacity-50`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground">{summarizeVariants(regenVariants)}</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setRegenTarget(null)} disabled={regenLoading}>Cancel</Button>
              <Button size="sm" onClick={runRegenDesign} disabled={regenLoading || (regenMode === "full" && !regenNiche.trim())}>
                {regenLoading
                  ? (<><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> {regenMode === "variants-only" ? "Applying…" : "Generating…"}</>)
                  : regenMode === "variants-only"
                    ? (<><LayoutGrid className="h-3.5 w-3.5 mr-2" /> Apply Layouts</>)
                    : (<><Sparkles className="h-3.5 w-3.5 mr-2" /> Regenerate</>)}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.linkedCampaigns.length ? (
                <>This template is used in {deleteTarget.linkedCampaigns.length} campaign(s). Deleting will unlink them.</>
              ) : (
                "This action cannot be undone."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && performDelete(deleteTarget.id, (deleteTarget.linkedCampaigns.length ?? 0) > 0)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!duplicateTarget} onOpenChange={() => setDuplicateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a copy of "{duplicateTarget?.name}" that you can edit independently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (duplicateTarget) duplicateMutation.mutate(duplicateTarget);
                setDuplicateTarget(null);
              }}
            >
              Duplicate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} templates?</AlertDialogTitle>
            <AlertDialogDescription>This will unlink all associated campaigns. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={bulkDelete}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* URL Import Loading Overlay */}
      <Dialog open={urlImporting} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm text-center" onPointerDownOutside={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <h3 className="font-semibold text-lg">Importing Page...</h3>
              <p className="text-sm text-muted-foreground mt-1">Scanning design, styles & content. This may take a few seconds.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Creation Picker */}
      <TemplateCreationPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickerSelect}
      />

      {/* Per-template content width editor */}
      <Dialog open={!!widthTemplate} onOpenChange={(open) => !open && setWidthTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Content width — {widthTemplate?.name}</DialogTitle>
          </DialogHeader>
          {widthTemplate && (
            <ContainerWidthControl
              table="templates"
              id={widthTemplate.id}
              inheritLabel="Inherit workspace default"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk content width */}
      <BulkBoxSettingsDialog
        open={bulkWidthOpen}
        onOpenChange={setBulkWidthOpen}
        table="templates"
        ids={[...selectedIds]}
        onApplied={() => {
          queryClient.invalidateQueries({ queryKey: ["templates"] });
          setSelectedIds(new Set());
        }}
      />

      {/* Republish after rebox */}
      <AlertDialog open={republishOpen} onOpenChange={setRepublishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Republish updated templates?</AlertDialogTitle>
            <AlertDialogDescription>
              {reboxedIds.length} template(s) were reboxed. Do you want to republish already-published
              pages that use these templates so the live pages pick up the new boxed layout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={republishMutation.isPending}>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); republishMutation.mutate(reboxedIds); }}
              disabled={republishMutation.isPending}
            >
              {republishMutation.isPending ? "Republishing…" : "Republish pages"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
