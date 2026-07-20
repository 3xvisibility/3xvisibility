import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { callAI } from "@/lib/ai-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Pencil, Sparkles, Loader2, FolderOpen, ArrowRight, KeyRound } from "lucide-react";
import { autoExtractTemplateVariables } from "@/lib/template-variable-extractor";
import { GEO_VAR_NAMES } from "@/lib/campaign-row-merge";

const BUSINESS_VAR_NAMES = new Set([
  "company_name", "company", "brand_name", "brand",
  "phone", "phone_number", "email", "address", "website", "url",
  "owner", "author",
]);

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "tr", label: "Turkish" },
  { code: "bn", label: "Bengali" },
];

interface GroupVariable {
  name: string;
  terms: string[];
}

interface KeywordGroup {
  id: string;
  name: string;
  template_id: string | null;
  language: string;
  variables: GroupVariable[];
  updated_at: string;
}

interface TemplateRow {
  id: string;
  name: string;
  content: string | null;
  variables: string[] | null;
  updated_at: string;
}

function isSkippedVar(name: string): boolean {
  const n = name.trim().toLowerCase();
  if (BUSINESS_VAR_NAMES.has(n)) return true;
  return (GEO_VAR_NAMES as readonly string[]).includes(n);
}

/** Extract variable names from a template — prefer stored `variables`, fall back to HTML `{name}` scan. */
function templateVarNames(tpl: TemplateRow | undefined): string[] {
  if (!tpl) return [];
  const stored = Array.isArray(tpl.variables) ? tpl.variables.filter(Boolean) : [];
  const fromHtml = new Set<string>();
  const re = /\{([a-z][a-z0-9_]*)\}/gi;
  const html = tpl.content || "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) fromHtml.add(m[1].toLowerCase());
  // If no explicit placeholders, auto-extract text vars from HTML.
  let names: string[];
  if (stored.length > 0 || fromHtml.size > 0) {
    names = [...new Set([...stored, ...fromHtml])];
  } else {
    names = autoExtractTemplateVariables(html).map(v => v.name);
  }
  return names.filter(n => !isSkippedVar(n));
}

export default function KeywordGroupsPage() {
  const { currentWorkspace, basePath } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<KeywordGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KeywordGroup | null>(null);

  // wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [groupName, setGroupName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [language, setLanguage] = useState("en");
  const [variables, setVariables] = useState<GroupVariable[]>([]);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["pgp-keyword-groups", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pgp_keyword_groups")
        .select("id, name, template_id, language, variables, updated_at")
        .eq("workspace_id", wsId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any): KeywordGroup => ({
        id: d.id,
        name: d.name,
        template_id: d.template_id,
        language: d.language || "en",
        variables: Array.isArray(d.variables) ? d.variables : [],
        updated_at: d.updated_at,
      }));
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates-for-groups", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("id, name, content, variables, updated_at")
        .eq("workspace_id", wsId!)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TemplateRow[];
    },
  });

  const selectedTemplate = useMemo(() => templates.find(t => t.id === templateId), [templates, templateId]);
  const templateVars = useMemo(() => templateVarNames(selectedTemplate), [selectedTemplate]);

  // Sync variable list when template changes.
  useEffect(() => {
    if (!templateId) { setVariables([]); return; }
    setVariables(prev => {
      const byName = new Map(prev.map(v => [v.name, v]));
      return templateVars.map(n => byName.get(n) || { name: n, terms: [] });
    });
  }, [templateId, templateVars.join("|")]);

  const resetWizard = () => {
    setStep(1);
    setGroupName("");
    setTemplateId("");
    setLanguage("en");
    setVariables([]);
    setEditing(null);
  };

  const openCreate = () => {
    resetWizard();
    setEditorOpen(true);
  };

  const openEdit = (g: KeywordGroup) => {
    setEditing(g);
    setGroupName(g.name);
    setTemplateId(g.template_id || "");
    setLanguage(g.language);
    setVariables(g.variables);
    setStep(2);
    setEditorOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!wsId) throw new Error("No workspace");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const cleanName = groupName.trim();
      if (!cleanName) throw new Error("Give this group a name");
      if (!templateId) throw new Error("Pick a template");
      const payload = {
        workspace_id: wsId,
        user_id: user.id,
        name: cleanName,
        template_id: templateId,
        language,
        variables: variables.map(v => ({ name: v.name, terms: v.terms.filter(t => t.trim()) })),
      };
      if (editing?.id) {
        const { error } = await supabase.from("pgp_keyword_groups").update(payload as any).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pgp_keyword_groups").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgp-keyword-groups"] });
      toast({ title: editing ? "Keyword group updated" : "Keyword group created" });
      setEditorOpen(false);
      resetWizard();
    },
    onError: (err: Error) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pgp_keyword_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgp-keyword-groups"] });
      toast({ title: "Keyword group deleted" });
      setDeleteTarget(null);
    },
  });

  const aiGenerateTerms = async (varName: string) => {
    setAiBusy(varName);
    try {
      const langLabel = LANGUAGES.find(l => l.code === language)?.label || "English";
      const prompt = `Generate 15 concise, real-world search values for the variable "{${varName}}" in a website template. Return one plain value per line, no numbering, no explanations. Language: ${langLabel}.`;
      const res = await callAI({
        messages: [
          { role: "system", content: "You return only plain values, one per line. No markdown, no HTML." },
          { role: "user", content: prompt },
        ],
      });
      const text = res?.content || "";
      const terms = text.split("\n").map(l => l.replace(/^[\d.\-*)\s]+/, "").trim()).filter(l => l && l.length < 100);
      setVariables(prev => prev.map(v => v.name === varName ? { ...v, terms: [...new Set([...v.terms, ...terms])] } : v));
      toast({ title: `Added ${terms.length} values`, description: `for {${varName}}` });
    } catch (err: any) {
      toast({ title: "AI generation failed", description: err?.message, variant: "destructive" });
    } finally {
      setAiBusy(null);
    }
  };

  const sendToCampaign = (g: KeywordGroup) => {
    // Cross-join variables into rows for the campaign wizard's CSV data source.
    const vars = g.variables.filter(v => v.terms.length > 0);
    if (vars.length === 0) {
      toast({ title: "This group has no terms yet", description: "Add terms first, then send to a campaign.", variant: "destructive" });
      return;
    }
    const MAX_ROWS = 5000;
    let rows: Record<string, string>[] = [{}];
    for (const v of vars) {
      const next: Record<string, string>[] = [];
      for (const r of rows) {
        for (const t of v.terms) {
          next.push({ ...r, [v.name]: t });
          if (next.length >= MAX_ROWS) break;
        }
        if (next.length >= MAX_ROWS) break;
      }
      rows = next;
    }
    const headers = vars.map(v => v.name);
    const payload = {
      name: g.name,
      templateId: g.template_id || undefined,
      keywordGroupId: g.id,
      csvHeaders: headers,
      csvRows: rows,
      language: g.language,
      startStep: 3, // jump to Locations / mapping step
    };
    try {
      sessionStorage.setItem("__campaign_prefill", JSON.stringify(payload));
    } catch { /* ignore */ }
    navigate(`${basePath}/pgp-generate`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" /> Keyword Groups
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Bundle a template + language + all your keyword terms into one reusable pack.
            Then in Campaigns just pick the group, add Locations + Business Info, and generate.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Keyword Group
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No keyword groups yet.</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Create your first group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {groups.map(g => {
            const tpl = templates.find(t => t.id === g.template_id);
            const totalTerms = g.variables.reduce((s, v) => s + v.terms.length, 0);
            return (
              <Card key={g.id}>
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{g.name}</h3>
                      <Badge variant="secondary" className="text-[10px]">
                        {LANGUAGES.find(l => l.code === g.language)?.label || g.language}
                      </Badge>
                      {tpl && <Badge variant="outline" className="text-[10px]">Template: {tpl.name}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {g.variables.length} variable{g.variables.length !== 1 ? "s" : ""} · {totalTerms} term{totalTerms !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.variables.slice(0, 8).map(v => (
                        <code key={v.name} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">
                          {`{${v.name}}`} <span className="text-muted-foreground">·{v.terms.length}</span>
                        </code>
                      ))}
                      {g.variables.length > 8 && <span className="text-[10px] text-muted-foreground">+{g.variables.length - 8}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(g)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(g)} className="text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" onClick={() => sendToCampaign(g)}>
                      Use in Campaign <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Wizard */}
      <Dialog open={editorOpen} onOpenChange={(o) => { if (!o) resetWizard(); setEditorOpen(o); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{editing ? "Edit keyword group" : "New keyword group"}</DialogTitle>
            <DialogDescription>
              Step {step} of 3 — {step === 1 ? "Pick template" : step === 2 ? "Language + variables & terms" : "Name & save"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {step === 1 && (
              <div className="space-y-3">
                <Label>Choose a template (latest first)</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Pick a template..." /></SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 && <SelectItem value="__none__" disabled>No templates yet</SelectItem>}
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-2">
                    <p className="text-muted-foreground">Variables detected (locations & business info are handled in the Campaign wizard and skipped here):</p>
                    <div className="flex flex-wrap gap-1">
                      {templateVars.length === 0 ? (
                        <span className="text-muted-foreground italic">No non-geo/non-business variables found in this template.</span>
                      ) : templateVars.map(n => (
                        <code key={n} className="font-mono px-1.5 py-0.5 rounded bg-background border">{`{${n}}`}</code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">AI-generated terms will be produced in this language.</p>
                </div>

                {variables.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No variables to fill. Go back and pick a different template.</p>
                ) : variables.map((v, idx) => (
                  <div key={v.name} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <code className="text-sm font-mono px-2 py-0.5 rounded bg-muted">{`{${v.name}}`}</code>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{v.terms.length} term{v.terms.length !== 1 ? "s" : ""}</Badge>
                        <Button size="sm" variant="outline" disabled={aiBusy === v.name} onClick={() => aiGenerateTerms(v.name)}>
                          {aiBusy === v.name ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                          AI generate
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={v.terms.join("\n")}
                      onChange={(e) => {
                        const terms = e.target.value.split("\n").map(t => t.trim()).filter(Boolean);
                        setVariables(prev => prev.map((x, i) => i === idx ? { ...x, terms } : x));
                      }}
                      placeholder="One value per line..."
                      rows={5}
                      className="font-mono text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <Label>Group name</Label>
                <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="e.g. Plumbing services — English" />
                <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                  <p><strong>Template:</strong> {selectedTemplate?.name || "—"}</p>
                  <p><strong>Language:</strong> {LANGUAGES.find(l => l.code === language)?.label}</p>
                  <p><strong>Variables:</strong> {variables.length} · <strong>Total terms:</strong> {variables.reduce((s, v) => s + v.terms.length, 0)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t px-6 py-3 flex items-center justify-between gap-3 bg-muted/20">
            <Button variant="ghost" onClick={() => step === 1 ? setEditorOpen(false) : setStep((step - 1) as any)}>
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((step + 1) as any)}
                disabled={step === 1 ? !templateId : variables.length === 0}
              >
                Next
              </Button>
            ) : (
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !groupName.trim()}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {editing ? "Save changes" : "Create group"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete keyword group?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <strong>{deleteTarget?.name}</strong>. Campaigns already created from it are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
