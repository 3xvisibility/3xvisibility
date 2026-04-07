import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, KeyRound, Trash2, Upload, Download, Copy, Search as SearchIcon,
  Pencil, MoreVertical, Loader2, Sparkles, FileText, Database, ChevronLeft, ChevronRight,
  MapPin, Globe, Link2, Rss,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const PAGE_SIZE = 15;

interface PgpKeyword {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  source: string;
  terms: string[];
  delimiter: string | null;
  columns: string[];
  source_config: Record<string, any>;
  term_count: number;
  created_at: string;
  updated_at: string;
}

export default function PgpKeywordsPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PgpKeyword | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PgpKeyword | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Editor state
  const [kwName, setKwName] = useState("");
  const [kwSource, setKwSource] = useState("local");
  const [kwTerms, setKwTerms] = useState("");
  const [kwDelimiter, setKwDelimiter] = useState("");
  const [kwColumns, setKwColumns] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState("20");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Location source state
  const [locCountry, setLocCountry] = useState("US");
  const [locState, setLocState] = useState("");
  const [locInclude, setLocInclude] = useState({ city: true, state: true, zip: false, county: false, region: false });
  const [locLoading, setLocLoading] = useState(false);
  const [locFormat, setLocFormat] = useState("{city}, {state}");

  // Dynamic source state
  const [dynUrl, setDynUrl] = useState("");
  const [dynLoading, setDynLoading] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ["pgp-keywords", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgp_keywords")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PgpKeyword[];
    },
  });

  // Fetch unique countries and states for location source
  const { data: locCountries = [] } = useQuery({
    queryKey: ["loc-countries"],
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("country_code, country").limit(500);
      const unique = [...new Map((data || []).map(d => [d.country_code, d.country])).entries()];
      return unique.map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const { data: locStates = [] } = useQuery({
    queryKey: ["loc-states", locCountry],
    enabled: !!locCountry,
    queryFn: async () => {
      const { data } = await supabase.from("locations").select("state").eq("country_code", locCountry).limit(1000);
      return [...new Set((data || []).map(d => d.state))].sort();
    },
  });

  const filtered = keywords.filter(kw =>
    !searchQuery || kw.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetEditor = () => {
    setKwName(""); setKwSource("local"); setKwTerms("");
    setKwDelimiter(""); setKwColumns(""); setAiTopic(""); setAiCount("20");
    setLocCountry("US"); setLocState(""); setLocInclude({ city: true, state: true, zip: false, county: false, region: false });
    setLocFormat("{city}, {state}"); setDynUrl("");
    setEditing(null);
  };

  const openEditor = (kw?: PgpKeyword) => {
    if (kw) {
      setEditing(kw);
      setKwName(kw.name);
      setKwSource(kw.source);
      setKwTerms((kw.terms || []).join("\n"));
      setKwDelimiter(kw.delimiter || "");
      setKwColumns((kw.columns || []).join(", "));
      if (kw.source_config) {
        if (kw.source_config.country) setLocCountry(kw.source_config.country);
        if (kw.source_config.state) setLocState(kw.source_config.state);
        if (kw.source_config.format) setLocFormat(kw.source_config.format);
        if (kw.source_config.url) setDynUrl(kw.source_config.url);
      }
    } else {
      resetEditor();
    }
    setEditorOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");

      const cleanName = kwName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      if (!cleanName) throw new Error("Keyword name is required");

      const termsArray = kwTerms.split("\n").map(t => t.trim()).filter(Boolean);
      const columnsArray = kwColumns ? kwColumns.split(",").map(c => c.trim()).filter(Boolean) : [];

      const sourceConfig: Record<string, any> = {};
      if (kwSource === "location") {
        sourceConfig.country = locCountry;
        sourceConfig.state = locState;
        sourceConfig.format = locFormat;
        sourceConfig.include = locInclude;
      } else if (["csv_url", "google_sheet", "rss_feed"].includes(kwSource)) {
        sourceConfig.url = dynUrl;
      }

      const payload = {
        name: cleanName,
        source: kwSource,
        terms: termsArray,
        delimiter: kwDelimiter || null,
        columns: columnsArray,
        term_count: termsArray.length,
        source_config: sourceConfig,
        workspace_id: wsId,
        user_id: user.id,
      };

      if (editing?.id) {
        const { error } = await supabase.from("pgp_keywords").update(payload as any).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pgp_keywords").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pgp-keywords"] });
      toast({ title: editing ? "Keyword updated" : "Keyword created" });
      setEditorOpen(false);
      resetEditor();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pgp_keywords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pgp-keywords"] });
      toast({ title: "Keyword deleted" });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const duplicateKeyword = async (kw: PgpKeyword) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !wsId) return;
    const newName = `${kw.name}_copy_${Date.now().toString(36)}`;
    const { error } = await supabase.from("pgp_keywords").insert({
      ...kw, id: undefined, name: newName, workspace_id: wsId, user_id: user.id,
      created_at: undefined, updated_at: undefined,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      queryClient.invalidateQueries({ queryKey: ["pgp-keywords"] });
      toast({ title: "Keyword duplicated" });
    }
  };

  const exportKeyword = (kw: PgpKeyword) => {
    const blob = new Blob([(kw.terms || []).join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${kw.name}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importTerms = async (file: File) => {
    const text = await file.text();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    setKwTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n"));
    toast({ title: `${lines.length} terms imported` });
    if (importRef.current) importRef.current.value = "";
  };

  const generateAiTerms = async () => {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: {
          prompt: `Generate exactly ${aiCount} unique terms for a keyword called "${kwName || aiTopic}". Topic: ${aiTopic}. Output ONLY the terms, one per line. No numbering, no explanations, no markdown.`,
        },
      });
      if (error) throw error;
      const raw = (data?.content || "").replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      const lines = raw.split("\n").map((l: string) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean);
      setKwTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n"));
      toast({ title: `${lines.length} AI terms generated` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const generateLocationTerms = async () => {
    setLocLoading(true);
    try {
      let query = supabase.from("locations").select("city, state, state_code, county, region, zip_code, country").eq("country_code", locCountry);
      if (locState) query = query.eq("state", locState);
      const { data, error } = await query.limit(1000);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "No locations found", description: "Try a different country or state.", variant: "destructive" });
        return;
      }
      const terms = data.map(loc => {
        let term = locFormat;
        term = term.replace(/\{city\}/gi, loc.city || "");
        term = term.replace(/\{state\}/gi, loc.state || "");
        term = term.replace(/\{state_code\}/gi, loc.state_code || "");
        term = term.replace(/\{county\}/gi, loc.county || "");
        term = term.replace(/\{region\}/gi, loc.region || "");
        term = term.replace(/\{zip_code\}/gi, loc.zip_code || "");
        term = term.replace(/\{country\}/gi, loc.country || "");
        return term.trim();
      }).filter(Boolean);

      // If using delimiter format, set columns
      if (locInclude.city || locInclude.state || locInclude.zip || locInclude.county) {
        const cols: string[] = [];
        if (locInclude.city) cols.push("city");
        if (locInclude.state) cols.push("state");
        if (locInclude.county) cols.push("county");
        if (locInclude.zip) cols.push("zip_code");
        if (locInclude.region) cols.push("region");
        setKwColumns(cols.join(", "));

        // Build delimiter-based terms
        const delimTerms = data.map(loc => {
          const parts: string[] = [];
          if (locInclude.city) parts.push(loc.city || "");
          if (locInclude.state) parts.push(loc.state || "");
          if (locInclude.county) parts.push(loc.county || "");
          if (locInclude.zip) parts.push(loc.zip_code || "");
          if (locInclude.region) parts.push(loc.region || "");
          return parts.join("|");
        });
        setKwDelimiter("|");
        setKwTerms(prev => prev ? `${prev}\n${delimTerms.join("\n")}` : delimTerms.join("\n"));
      } else {
        setKwTerms(prev => prev ? `${prev}\n${terms.join("\n")}` : terms.join("\n"));
      }

      toast({ title: `${data.length} location terms generated` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setLocLoading(false);
    }
  };

  const fetchDynamicSource = async () => {
    if (!dynUrl.trim()) return;
    setDynLoading(true);
    try {
      const resp = await fetch(dynUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      
      // Try JSON
      try {
        const json = JSON.parse(text);
        let lines: string[] = [];
        if (Array.isArray(json)) {
          lines = json.map((item: any) => typeof item === "string" ? item : JSON.stringify(item));
        } else if (json.items) {
          lines = json.items.map((item: any) => typeof item === "string" ? item : item.title || item.name || JSON.stringify(item));
        }
        if (lines.length > 0) {
          setKwTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n"));
          toast({ title: `${lines.length} terms fetched from JSON` });
          return;
        }
      } catch {}

      // Try RSS/XML
      if (text.includes("<rss") || text.includes("<feed") || text.includes("<item")) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/xml");
        const items = doc.querySelectorAll("item title, entry title");
        const lines = Array.from(items).map(el => el.textContent?.trim() || "").filter(Boolean);
        if (lines.length > 0) {
          setKwTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n"));
          toast({ title: `${lines.length} terms fetched from RSS` });
          return;
        }
      }

      // Plain text / CSV
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      setKwTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n"));
      toast({ title: `${lines.length} terms fetched` });
    } catch (err: any) {
      toast({ title: "Failed to fetch", description: err.message, variant: "destructive" });
    } finally {
      setDynLoading(false);
    }
  };

  const sourceLabels: Record<string, string> = {
    local: "Local", csv: "CSV", ai: "AI", location: "Location",
    csv_url: "CSV URL", google_sheet: "Sheet", rss_feed: "RSS",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-display">Keywords</h1>
          <p className="text-muted-foreground mt-1">
            Define reusable keyword groups with terms that cycle during page generation.
          </p>
        </div>
        <Button size="sm" onClick={() => openEditor()}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Keyword
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search keywords..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-8 h-9" />
      </div>

      {/* Keywords List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-surface">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
              <KeyRound className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold mb-1">{keywords.length === 0 ? "No keywords yet" : "No matching keywords"}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {keywords.length === 0 ? "Keywords are template tags with lists of terms that cycle during generation." : "Try adjusting your search."}
            </p>
            {keywords.length === 0 && (
              <Button onClick={() => openEditor()}>
                <Plus className="mr-2 h-4 w-4" /> Add Your First Keyword
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-surface overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Keyword</TableHead>
                <TableHead className="w-[15%]">Source</TableHead>
                <TableHead className="w-[15%]">Terms</TableHead>
                <TableHead className="w-[10%]">Columns</TableHead>
                <TableHead className="w-[15%]">Updated</TableHead>
                <TableHead className="text-right w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(kw => (
                <TableRow key={kw.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium font-mono text-sm cursor-pointer hover:text-primary" onClick={() => openEditor(kw)}>
                        {`{${kw.name}}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] capitalize">{sourceLabels[kw.source] || kw.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm tabular-nums">{kw.term_count}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm tabular-nums">{(kw.columns || []).length || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{new Date(kw.updated_at).toLocaleDateString()}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEditor(kw)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateKeyword(kw)}><Copy className="h-3.5 w-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportKeyword(kw)}><Download className="h-3.5 w-3.5 mr-2" /> Export</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(kw)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Keyword Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={(v) => { if (!v) { setEditorOpen(false); resetEditor(); } }}>
        <DialogContent className="sm:w-[min(96vw,60rem)] sm:max-w-none max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {editing ? "Edit Keyword" : "Add Keyword"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-5 mt-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Keyword Name</Label>
              <Input
                placeholder="e.g., service, city, product_name"
                value={kwName}
                onChange={(e) => setKwName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                className="font-mono h-11"
              />
              <p className="text-[11px] text-muted-foreground">
                Use in templates as <code className="bg-muted px-1 rounded">{`{${kwName || "keyword"}}`}</code>
              </p>
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Source</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {[
                  { value: "local", label: "Local", icon: FileText, desc: "Manual entry" },
                  { value: "csv", label: "CSV File", icon: Database, desc: "Import file" },
                  { value: "ai", label: "AI", icon: Sparkles, desc: "AI generated" },
                  { value: "location", label: "Location", icon: MapPin, desc: "Location DB" },
                  { value: "csv_url", label: "CSV URL", icon: Link2, desc: "Remote CSV" },
                  { value: "google_sheet", label: "Sheet", icon: Globe, desc: "Google Sheets" },
                  { value: "rss_feed", label: "RSS", icon: Rss, desc: "RSS feed" },
                ].map(s => (
                  <button
                    key={s.value}
                    onClick={() => setKwSource(s.value)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${
                      kwSource === s.value ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border hover:bg-accent"
                    }`}
                  >
                    <s.icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium">{s.label}</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Generation */}
            {kwSource === "ai" && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Term Generator
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px] gap-2">
                  <Input placeholder="Topic (e.g., plumbing services, US cities)" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="h-9" />
                  <Input type="number" placeholder="Count" value={aiCount} onChange={(e) => setAiCount(e.target.value)} className="h-9" min={1} max={500} />
                </div>
                <Button size="sm" onClick={generateAiTerms} disabled={aiGenerating || !aiTopic.trim()}>
                  {aiGenerating ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Generating...</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate Terms</>}
                </Button>
              </div>
            )}

            {/* Location Source */}
            {kwSource === "location" && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" /> Generate Location Keywords
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Country</Label>
                    <Select value={locCountry} onValueChange={setLocCountry}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {locCountries.length > 0 ? locCountries.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                        )) : <SelectItem value="US">United States</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">State / Region (optional)</Label>
                    <Select value={locState} onValueChange={setLocState}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="All states" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="__all__">All states</SelectItem>
                        {locStates.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Include Fields</Label>
                  <div className="flex flex-wrap gap-3">
                    {(["city", "state", "county", "zip", "region"] as const).map(field => (
                      <label key={field} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox
                          checked={locInclude[field]}
                          onCheckedChange={(v) => setLocInclude(prev => ({ ...prev, [field]: !!v }))}
                        />
                        <span className="capitalize">{field === "zip" ? "ZIP Code" : field}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Term Format</Label>
                  <Input value={locFormat} onChange={(e) => setLocFormat(e.target.value)} className="h-9 font-mono text-xs" placeholder="{city}, {state}" />
                  <p className="text-[10px] text-muted-foreground">Variables: {"{city}"}, {"{state}"}, {"{state_code}"}, {"{county}"}, {"{zip_code}"}, {"{region}"}</p>
                </div>
                <Button size="sm" onClick={generateLocationTerms} disabled={locLoading}>
                  {locLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Loading...</> : <><MapPin className="h-3.5 w-3.5 mr-1.5" /> Generate Location Terms</>}
                </Button>
              </div>
            )}

            {/* Dynamic URL Sources */}
            {["csv_url", "google_sheet", "rss_feed"].includes(kwSource) && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  {kwSource === "rss_feed" ? <Rss className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5 text-primary" />}
                  {kwSource === "csv_url" && "Fetch from CSV URL"}
                  {kwSource === "google_sheet" && "Fetch from Google Sheets (Published CSV)"}
                  {kwSource === "rss_feed" && "Fetch from RSS Feed"}
                </p>
                <Input
                  placeholder={
                    kwSource === "csv_url" ? "https://example.com/data.csv"
                    : kwSource === "google_sheet" ? "https://docs.google.com/spreadsheets/d/.../export?format=csv"
                    : "https://example.com/feed.xml"
                  }
                  value={dynUrl}
                  onChange={(e) => setDynUrl(e.target.value)}
                  className="h-9 font-mono text-xs"
                />
                {kwSource === "google_sheet" && (
                  <p className="text-[10px] text-muted-foreground">
                    Publish your Google Sheet as CSV: File → Share → Publish to web → Select CSV format
                  </p>
                )}
                <Button size="sm" onClick={fetchDynamicSource} disabled={dynLoading || !dynUrl.trim()}>
                  {dynLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Fetching...</> : <><Download className="h-3.5 w-3.5 mr-1.5" /> Fetch Terms</>}
                </Button>
              </div>
            )}

            {/* CSV Import */}
            {kwSource === "csv" && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-primary" /> Import from File
                </p>
                <input ref={importRef} type="file" accept=".txt,.csv,.json,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importTerms(f); }} />
                <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload File (TXT, CSV, JSON, Excel)
                </Button>
                <p className="text-[11px] text-muted-foreground">One term per line. CSV/Excel files use the first column.</p>
              </div>
            )}

            {/* Terms */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Terms</Label>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {kwTerms.split("\n").filter(Boolean).length} term(s)
                </span>
              </div>
              <Textarea
                placeholder={"bathroom installations\nfixing leaks\ncentral heating\nkitchen plumbing\ndrain cleaning"}
                value={kwTerms}
                onChange={(e) => setKwTerms(e.target.value)}
                rows={10}
                className="font-mono text-xs leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">One term per line. Each generated page uses a different term.</p>
            </div>

            {/* Delimiter & Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Delimiter (optional)</Label>
                <Input placeholder="e.g., | or ," value={kwDelimiter} onChange={(e) => setKwDelimiter(e.target.value)} className="font-mono h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">Split each term into columns.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Column Names (optional)</Label>
                <Input placeholder="e.g., city, state, zip" value={kwColumns} onChange={(e) => setKwColumns(e.target.value)} className="font-mono h-9 text-sm" />
                <p className="text-[10px] text-muted-foreground">
                  Access as <code className="bg-muted px-1 rounded">{`{${kwName || "keyword"}(column_name)}`}</code>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-3 border-t bg-card">
            <Button variant="outline" onClick={() => { setEditorOpen(false); resetEditor(); }}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!kwName.trim() || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editing ? "Save Changes" : "Create Keyword"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Keyword?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{`{${deleteTarget?.name}}`}</strong> and its {deleteTarget?.term_count || 0} terms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}