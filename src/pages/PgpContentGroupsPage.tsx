import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Plus, FileText, Trash2, Copy, Search as SearchIcon, Pencil,
  MoreVertical, Download, Play, ChevronLeft, ChevronRight, Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { filterDesignVars } from "@/lib/design-vars-filter";
import { TemplateEditorDialog } from "@/components/templates/TemplateEditorDialog";
import { useNavigate } from "react-router-dom";

type Template = Tables<"templates">;
const PAGE_SIZE = 10;

export default function PgpContentGroupsPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentWorkspace, basePath } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["pgp-content-groups", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("*").eq("workspace_id", wsId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
  });

  const { data: keywords = [] } = useQuery({
    queryKey: ["pgp-keywords", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pgp_keywords").select("name, term_count").eq("workspace_id", wsId!);
      if (error) throw error;
      return data as { name: string; term_count: number }[];
    },
  });

  const keywordMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const k of keywords) m[k.name] = k.term_count;
    return m;
  }, [keywords]);

  const filtered = templates.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const createMutation = useMutation({
    mutationFn: async (params: { name: string; content: string; seoTitlePattern?: string; seoDescriptionPattern?: string; schemaType?: string; schemaConfig?: Record<string, any> }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !wsId) throw new Error("Not authenticated");
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
      queryClient.invalidateQueries({ queryKey: ["pgp-content-groups"] });
      toast({ title: "Content Group created" });
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
      queryClient.invalidateQueries({ queryKey: ["pgp-content-groups"] });
      toast({ title: "Content Group updated" });
      setEditorOpen(false);
      setEditingTemplate(null);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSave = (data: { name: string; content: string; seoTitlePattern: string; seoDescriptionPattern: string; schemaType: string; schemaConfig: Record<string, any> }) => {
    if (editingTemplate?.id) {
      updateMutation.mutate({ id: editingTemplate.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const performDelete = async (id: string) => {
    try {
      await supabase.from("campaigns").update({ template_id: null }).eq("template_id", id);
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["pgp-content-groups"] });
      toast({ title: "Content Group deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const openEditor = (tpl?: Template) => {
    setEditingTemplate(tpl || null);
    setEditorOpen(true);
  };

  const getKeywordStatus = (tpl: Template) => {
    const vars = filterDesignVars(tpl.variables || []).map(v => v.replace(/[{}]/g, ""));
    const matched = vars.filter(v => v in keywordMap);
    const missing = vars.filter(v => !(v in keywordMap));
    return { matched, missing, total: vars.length };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-display">Content Groups</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Define content templates that use Keywords to mass generate pages.
          </p>
        </div>
        <Button size="sm" className="w-fit shrink-0" onClick={() => openEditor()}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Content Group
        </Button>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search content groups..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-8 h-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="shadow-surface">
          <CardContent className="p-12 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Layers className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold mb-1">{templates.length === 0 ? "No content groups yet" : "No matches"}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {templates.length === 0 ? "A Content Group defines a reusable template with Keywords for mass page generation." : "Adjust your search."}
            </p>
            {templates.length === 0 && (
              <Button onClick={() => openEditor()}>
                <Plus className="mr-2 h-4 w-4" /> Create Content Group
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-surface overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Name</TableHead>
                  <TableHead className="min-w-[100px]">Keywords</TableHead>
                  <TableHead className="hidden sm:table-cell min-w-[80px]">Post Type</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[90px]">Updated</TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(tpl => {
                  const kwStatus = getKeywordStatus(tpl);
                  const cfg = (tpl.schema_config as Record<string, any>) || {};
                  return (
                    <TableRow key={tpl.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-medium text-xs sm:text-sm cursor-pointer hover:text-primary truncate max-w-[100px] sm:max-w-none" onClick={() => openEditor(tpl)}>
                            {tpl.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm tabular-nums">{kwStatus.total}</span>
                          {kwStatus.missing.length > 0 && (
                            <Badge variant="destructive" className="text-[9px]">{kwStatus.missing.length} missing</Badge>
                          )}
                          {kwStatus.missing.length === 0 && kwStatus.total > 0 && (
                            <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300">✓</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-[10px] capitalize">{cfg._postType || "page"}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{new Date(tpl.updated_at).toLocaleDateString()}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-[11px] hidden sm:inline-flex" onClick={() => navigate(`${basePath}/pgp-generate?group=${tpl.id}`)}>
                            <Play className="h-3 w-3 mr-1" /> Generate
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem className="sm:hidden" onClick={() => navigate(`${basePath}/pgp-generate?group=${tpl.id}`)}><Play className="h-3.5 w-3.5 mr-2" /> Generate</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditor(tpl)}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(tpl.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-3 sm:px-4 py-3">
              <p className="text-xs text-muted-foreground">{(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <TemplateEditorDialog
        open={editorOpen}
        onOpenChange={(v) => { if (!v) { setEditorOpen(false); setEditingTemplate(null); } }}
        editingTemplate={editingTemplate}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content Group?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this content group. Campaigns using it will be unlinked.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && performDelete(deleteTarget)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
