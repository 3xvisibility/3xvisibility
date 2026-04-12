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
} from "lucide-react";
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
import { TemplateCreationPicker, type CreationMethod, type ContentType } from "@/components/templates/TemplateCreationPicker";

type Template = Tables<"templates">;
const PAGE_SIZE = 10;

export default function TemplatesPage() {
  const [aiOpen, setAiOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
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
  // URL import loading
  const [urlImporting, setUrlImporting] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { t } = useLanguage();
  const { features } = useSubscription();
  const wsId = currentWorkspace?.id;
  const maxTemplates = features.templates;

  // ──── Queries ────
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("*").eq("workspace_id", wsId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
  });

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
      else if (sortColumn === "date") cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
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
      if (maxTemplates > 0 && templates.length >= maxTemplates) throw new Error(`Plan limit: max ${maxTemplates} templates.`);
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template updated" });
      setEditorOpen(false);
      setEditingTemplate(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (tpl: Template) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");
      const { error } = await supabase.from("templates").insert({
        name: `${tpl.name} (Copy)`, content: tpl.content, variables: tpl.variables,
        user_id: user.id, workspace_id: wsId,
        seo_title_pattern: (tpl as any).seo_title_pattern || "",
        seo_description_pattern: (tpl as any).seo_description_pattern || "",
        schema_type: (tpl as any).schema_type || "WebPage",
        schema_config: (tpl as any).schema_config || {},
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template duplicated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
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
      queryClient.invalidateQueries({ queryKey: ["templates"] });
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
      const data = JSON.parse(await file.text());
      if (!data.name || !data.content) throw new Error("Invalid template file.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");
      const { error } = await supabase.from("templates").insert({ name: data.name, content: data.content, variables: data.variables || [], user_id: user.id, workspace_id: wsId, seo_title_pattern: data.seo_title_pattern || "", seo_description_pattern: data.seo_description_pattern || "", schema_type: data.schema_type || "WebPage", schema_config: data.schema_config || {} } as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["templates"] });
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
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: `${selectedIds.size} template(s) deleted` });
      setSelectedIds(new Set());
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setBulkDeleteOpen(false); }
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

    // Auto-apply AI variable suggestions
    const detectedVars: string[] = [];
    for (const s of suggestions) {
      if (s.original && s.variable && html.includes(s.original)) {
        html = html.replace(s.original, `{${s.variable}}`);
        if (!detectedVars.includes(s.variable)) detectedVars.push(s.variable);
      }
    }

    const allVars = [...new Set([...detectedVars, ...pendingKeywords])];
    const fullContent = styles ? `<!-- STYLES -->\n${styles}\n<!-- /STYLES -->\n${html}` : html;
    setSiteDialogOpen(false); setSitePages([]);
    setEditingTemplate({ id: "", name: pageTitle || "Site Template", content: fullContent, variables: allVars, user_id: "", created_at: "", updated_at: "", workspace_id: wsId || null, schema_type: "WebPage", schema_config: {}, seo_title_pattern: "", seo_description_pattern: "" } as any);
    setEditorOpen(true);
    const varMsg = allVars.length > 0 ? ` — ${allVars.length} keywords detected: {${allVars.join("}, {")}}` : "";
    toast({ title: `Page imported as template${varMsg}` });
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

  const handlePickerSelect = (method: CreationMethod, config: { selectedKeywords: string[]; targetUrl?: string; selectedWebsite?: any; contentType?: ContentType }) => {
    setPendingKeywords(config.selectedKeywords);
    setPickerOpen(false);

    if (method === "ai") {
      setAiOpen(true);
    } else if (method === "url" && config.targetUrl) {
      importSitePage(config.targetUrl, "Imported Template");
    } else if (method === "website" && config.selectedWebsite) {
      const ct = config.contentType || "pages";
      setSiteWebsite(config.selectedWebsite.id);
      setSiteContentType(ct);
      loadSitePages(config.selectedWebsite.id, ct);
      setSiteDialogOpen(true);
    } else {
      // Design your own
      const keywordVars = config.selectedKeywords.map(k => `<p>{${k}}</p>`).join("\n");
      const scaffold = keywordVars
        ? `<div class="template">\n  <h1>{title}</h1>\n${keywordVars}\n</div>`
        : "";
      setEditingTemplate(scaffold ? { id: "", name: "New Template", content: scaffold, variables: config.selectedKeywords, user_id: "", created_at: "", updated_at: "", workspace_id: wsId || null, schema_type: "WebPage", schema_config: {}, seo_title_pattern: "", seo_description_pattern: "" } as any : null);
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
          <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Import JSON
          </Button>
          <Button size="sm" onClick={() => setPickerOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Template
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={siteTypeFilter} onValueChange={setSiteTypeFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="All Platforms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="wordpress">WordPress</SelectItem>
            <SelectItem value="shopify">Shopify</SelectItem>
            <SelectItem value="prestashop">PrestaShop</SelectItem>
            <SelectItem value="woocommerce">WooCommerce</SelectItem>
          </SelectContent>
        </Select>
        <Select value={campaignTypeFilter} onValueChange={setCampaignTypeFilter}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
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
                <Button onClick={() => setPickerOpen(true)}><Plus className="mr-2 h-4 w-4" /> Create Template</Button>
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
                      <span className="text-[10px] text-muted-foreground">{contentVars.length} vars</span>
                      <span className="text-[10px] text-muted-foreground">{info?.count ?? 0} campaigns</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Updated {new Date(tpl.updated_at).toLocaleDateString()}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => openEditor(tpl)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateMutation.mutate(tpl)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
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
                  <TableHead className="w-[35%]"><button className="flex items-center hover:text-foreground" onClick={() => toggleSort("name")}>Name <SortIcon col="name" /></button></TableHead>
                  <TableHead className="w-[12%]">Platform</TableHead>
                  <TableHead className="w-[8%]">Variables</TableHead>
                  <TableHead className="w-[10%]"><button className="flex items-center hover:text-foreground" onClick={() => toggleSort("campaigns")}>Campaigns <SortIcon col="campaigns" /></button></TableHead>
                  <TableHead className="w-[12%]"><button className="flex items-center hover:text-foreground" onClick={() => toggleSort("date")}>Updated <SortIcon col="date" /></button></TableHead>
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
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium truncate cursor-pointer hover:text-primary" onClick={() => openEditor(tpl)}>{tpl.name}</span>
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
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => openEditor(tpl)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(tpl)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
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
                      <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => openEditor(tpl)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateMutation.mutate(tpl)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportTemplate(tpl)}><Download className="h-3.5 w-3.5 mr-2" /> Export</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => checkAndDelete(tpl.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {siteTypes && [...siteTypes].map(st => <Badge key={st} variant="outline" className="text-[10px] capitalize">{st}</Badge>)}
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
        onSave={(name, content) => createMutation.mutate({ name, content })}
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
      <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5" />
              Import from Connected Site
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Website selector */}
            <Select value={siteWebsite} onValueChange={(v) => { setSiteWebsite(v); loadSitePages(v, siteContentType); }}>
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
                    onClick={() => { setSiteContentType(ct); loadSitePages(siteWebsite, ct); }}
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

            {/* Results */}
            {!siteLoading && sitePages.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{sitePages.length} {siteContentType} found — click to import as template</p>
                <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-1">
                  {sitePages.map(p => (
                    <button key={p.id || p.link} onClick={() => importSitePage(p.link, p.title)} className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors group">
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

      {/* Creation Picker */}
      <TemplateCreationPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickerSelect}
      />
    </div>
  );
}
