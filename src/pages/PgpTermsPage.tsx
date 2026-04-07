import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Tags, Trash2, Search as SearchIcon, Pencil, MoreVertical,
  Loader2, Sparkles, ChevronLeft, ChevronRight, FolderTree,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const PAGE_SIZE = 15;

interface TermGroup {
  id: string;
  name: string;
  taxonomy: string;
  terms: string[];
  term_count: number;
  auto_generate: boolean;
  keyword_source_id: string | null;
  workspace_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export default function PgpTermsPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<TermGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TermGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Editor state
  const [name, setName] = useState("");
  const [taxonomy, setTaxonomy] = useState("category");
  const [terms, setTerms] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [keywordSourceId, setKeywordSourceId] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  // We'll store term groups in the pgp_keywords table with source = "term_group"
  const { data: termGroups = [], isLoading } = useQuery({
    queryKey: ["pgp-term-groups", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgp_keywords")
        .select("*")
        .eq("workspace_id", wsId!)
        .eq("source", "term_group")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        taxonomy: d.source_config?.taxonomy || "category",
        terms: d.terms || [],
        term_count: d.term_count,
        auto_generate: d.source_config?.auto_generate || false,
        keyword_source_id: d.source_config?.keyword_source_id || null,
        workspace_id: d.workspace_id,
        user_id: d.user_id,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })) as TermGroup[];
    },
  });

  const { data: keywords = [] } = useQuery({
    queryKey: ["pgp-keywords-list", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgp_keywords")
        .select("id, name, terms, term_count")
        .eq("workspace_id", wsId!)
        .neq("source", "term_group");
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = termGroups.filter(tg =>
    !searchQuery || tg.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetEditor = () => {
    setName(""); setTaxonomy("category"); setTerms(""); setAutoGenerate(false);
    setKeywordSourceId(""); setAiTopic(""); setEditing(null);
  };

  const openEditor = (tg?: TermGroup) => {
    if (tg) {
      setEditing(tg);
      setName(tg.name);
      setTaxonomy(tg.taxonomy);
      setTerms(tg.terms.join("\n"));
      setAutoGenerate(tg.auto_generate);
      setKeywordSourceId(tg.keyword_source_id || "");
    } else {
      resetEditor();
    }
    setEditorOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");
      if (!name.trim()) throw new Error("Name is required");

      const termsArray = terms.split("\n").map(t => t.trim()).filter(Boolean);

      const payload = {
        name: name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
        source: "term_group" as string,
        terms: termsArray,
        term_count: termsArray.length,
        columns: [] as string[],
        delimiter: null as string | null,
        source_config: {
          taxonomy,
          auto_generate: autoGenerate,
          keyword_source_id: keywordSourceId || null,
        },
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
      queryClient.invalidateQueries({ queryKey: ["pgp-term-groups"] });
      toast({ title: editing ? "Term Group updated" : "Term Group created" });
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
      queryClient.invalidateQueries({ queryKey: ["pgp-term-groups"] });
      toast({ title: "Term Group deleted" });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const generateAiTerms = async () => {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-template", {
        body: {
          prompt: `Generate 20 unique ${taxonomy} names for: ${aiTopic}. Output ONLY the names, one per line. No numbering.`,
        },
      });
      if (error) throw error;
      const raw = (data?.content || "").replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
      const lines = raw.split("\n").map((l: string) => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean);
      setTerms(prev => prev ? `${prev}\n${lines.join("\n")}` : lines.join("\n"));
      toast({ title: `${lines.length} terms generated` });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const populateFromKeyword = () => {
    const kw = keywords.find(k => k.id === keywordSourceId);
    if (kw) {
      setTerms(prev => prev ? `${prev}\n${(kw.terms || []).join("\n")}` : (kw.terms || []).join("\n"));
      toast({ title: `${kw.terms?.length || 0} terms added from "${kw.name}"` });
    }
  };

  const taxonomyLabels: Record<string, string> = {
    category: "Category",
    tag: "Tag",
    custom: "Custom Taxonomy",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-display">Generate Terms</h1>
          <p className="text-muted-foreground mt-1">
            Mass-generate categories, tags, and custom taxonomies from keywords.
          </p>
        </div>
        <Button size="sm" onClick={() => openEditor()}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Term Group
        </Button>
      </div>

      <div className="relative max-w-xs">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search term groups..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-8 h-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-surface">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FolderTree className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold mb-1">{termGroups.length === 0 ? "No term groups yet" : "No matches"}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {termGroups.length === 0 ? "Term Groups let you mass-generate categories, tags, and taxonomies from your keyword lists." : "Adjust your search."}
            </p>
            {termGroups.length === 0 && (
              <Button onClick={() => openEditor()}>
                <Plus className="mr-2 h-4 w-4" /> Create Term Group
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-surface overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Name</TableHead>
                <TableHead className="w-[15%]">Taxonomy</TableHead>
                <TableHead className="w-[15%]">Terms</TableHead>
                <TableHead className="w-[15%]">Auto-Generate</TableHead>
                <TableHead className="w-[15%]">Updated</TableHead>
                <TableHead className="text-right w-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map(tg => (
                <TableRow key={tg.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tags className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm cursor-pointer hover:text-primary" onClick={() => openEditor(tg)}>{tg.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] capitalize">{taxonomyLabels[tg.taxonomy] || tg.taxonomy}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm tabular-nums">{tg.term_count}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tg.auto_generate ? "default" : "outline"} className="text-[10px]">
                      {tg.auto_generate ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{new Date(tg.updated_at).toLocaleDateString()}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openEditor(tg)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(tg)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
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

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={(v) => { if (!v) { setEditorOpen(false); resetEditor(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Term Group" : "New Term Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Name</Label>
              <Input placeholder="e.g. service_categories" value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Taxonomy Type</Label>
              <Select value={taxonomy} onValueChange={setTaxonomy}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="tag">Tag</SelectItem>
                  <SelectItem value="custom">Custom Taxonomy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Terms (one per line)</Label>
              <Textarea
                rows={8}
                placeholder={"Web Design\nSEO Services\nPPC Management\nSocial Media"}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">{terms.split("\n").filter(t => t.trim()).length} terms</p>
            </div>

            {/* Populate from keyword */}
            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-xs font-semibold">Populate from Keyword</Label>
              <div className="flex gap-2">
                <Select value={keywordSourceId} onValueChange={setKeywordSourceId}>
                  <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Select keyword..." /></SelectTrigger>
                  <SelectContent>
                    {keywords.map(kw => (
                      <SelectItem key={kw.id} value={kw.id}>{kw.name} ({kw.term_count} terms)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="h-8" disabled={!keywordSourceId} onClick={populateFromKeyword}>
                  Add
                </Button>
              </div>
            </div>

            {/* AI Generate */}
            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Generate
              </Label>
              <div className="flex gap-2">
                <Input placeholder="e.g. plumbing services" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="h-8 text-xs flex-1" />
                <Button size="sm" variant="outline" className="h-8" disabled={aiGenerating || !aiTopic.trim()} onClick={generateAiTerms}>
                  {aiGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-Generate on Campaign</p>
                <p className="text-[11px] text-muted-foreground">Create these terms automatically when generating pages</p>
              </div>
              <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditorOpen(false); resetEditor(); }}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Term Group?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this term group and all its terms.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
