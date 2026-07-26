// Admin marketplace management.
//
// Three views:
//   • Marketplace templates — rows in public.marketplace_templates (admin can
//     add new ones and delete them; these show up on the user Marketplace page)
//   • Built-in catalog      — the bundled COMMUNITY_TEMPLATES (read-only)
//   • User submissions      — shared_templates moderation (approve / remove)

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { SharedTemplatesModerationPanel } from "@/components/admin/SharedTemplatesModerationPanel";
import { COMMUNITY_TEMPLATES } from "@/lib/marketplace-templates";
import { ArrowLeft, Eye, Loader2, Monitor, Pencil, Plus, Search, Smartphone, Store, Tablet, Trash2, Package } from "lucide-react";

type PreviewDevice = "desktop" | "tablet" | "mobile";

const DEVICE_WIDTH: Record<PreviewDevice, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

/** Sandboxed render of the raw template HTML, with a device-width switcher. */
function TemplatePreview({
  html,
  device,
  onDeviceChange,
  variables,
}: {
  html: string;
  device: PreviewDevice;
  onDeviceChange: (d: PreviewDevice) => void;
  variables: string[];
}) {
  const doc = `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>body{margin:0}</style></head><body>${html}</body></html>`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          {([
            ["desktop", Monitor],
            ["tablet", Tablet],
            ["mobile", Smartphone],
          ] as const).map(([d, Icon]) => (
            <Button
              key={d}
              size="sm"
              variant={device === d ? "default" : "outline"}
              onClick={() => onDeviceChange(d)}
            >
              <Icon className="h-4 w-4 mr-1" />
              <span className="capitalize">{d}</span>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {variables.length === 0 ? (
            <Badge variant="outline" className="text-muted-foreground">No variables</Badge>
          ) : (
            variables.slice(0, 8).map((v) => (
              <Badge key={v} variant="outline" className="text-muted-foreground">{`{{${v}}}`}</Badge>
            ))
          )}
          {variables.length > 8 && (
            <Badge variant="outline" className="text-muted-foreground">+{variables.length - 8}</Badge>
          )}
        </div>
      </div>
      <div className="rounded-lg border bg-muted/30 p-3 flex justify-center">
        <iframe
          title="Template preview"
          sandbox="allow-same-origin"
          srcDoc={doc}
          className="bg-background rounded-md border h-[60vh]"
          style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
        />
      </div>
    </div>
  );
}


interface MarketplaceRow {
  id: string;
  name: string;
  description: string;
  category: string;
  variables: string[] | null;
  preview_html: string | null;
  source_url: string | null;
  created_at: string;
}

const VARIABLE_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

function extractVariables(html: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = VARIABLE_RE.exec(html))) out.add(m[1]);
  return Array.from(out);
}

/** One card in the unified grid — either a DB row or a bundled template. */
interface GridItem {
  key: string;
  id: string | null; // DB id (null for built-ins)
  builtin: boolean;
  name: string;
  description: string;
  category: string;
  html: string;
  variables: string[];
  source_url: string | null;
}

function Thumb({ html }: { html: string }) {
  const doc = `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>body{margin:0}</style></head><body>${html}</body></html>`;
  return (
    <div className="relative h-40 w-full overflow-hidden rounded-t-lg border-b bg-muted/30">
      <iframe
        title="thumb"
        sandbox="allow-same-origin"
        srcDoc={doc}
        scrolling="no"
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-background"
        style={{ width: "1280px", height: "800px", transform: "scale(0.28)" }}
      />
    </div>
  );
}

export function MarketplaceCatalogPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(24);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<GridItem | null>(null);
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [previewItem, setPreviewItem] = useState<GridItem | null>(null);

  const emptyForm = { name: "", description: "", category: "business", source_url: "", html: "" };
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setStep("edit");
    setAddOpen(true);
  };

  /** Built-ins open pre-filled but save as a new editable marketplace row. */
  const openEdit = (t: GridItem) => {
    setEditingId(t.builtin ? null : t.id);
    setForm({
      name: t.name,
      description: t.description || "",
      category: t.category || "business",
      source_url: t.source_url || "",
      html: t.html || "",
    });
    setStep("edit");
    setAddOpen(true);
  };

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-marketplace-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_templates")
        .select("id,name,description,category,variables,preview_html,source_url,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MarketplaceRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim() || "business",
        preview_html: form.html,
        variables: extractVariables(form.html),
        source_url: form.source_url.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("marketplace_templates")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingId);
        if (error) throw error;
        return "updated" as const;
      }

      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("marketplace_templates")
        .insert({ ...payload, created_by: userRes?.user?.id ?? null });
      if (error) throw error;
      return "created" as const;
    },
    onSuccess: (mode) => {
      toast({
        title: mode === "updated" ? "Template updated" : "Template added",
        description: "Changes are live on the Marketplace page.",
      });
      setAddOpen(false);
      setStep("edit");
      setEditingId(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["admin-marketplace-templates"] });
      qc.invalidateQueries({ queryKey: ["marketplace-admin-templates"] });
    },
    onError: (e: Error) =>
      toast({ title: "Could not save template", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template deleted" });
      qc.invalidateQueries({ queryKey: ["admin-marketplace-templates"] });
      qc.invalidateQueries({ queryKey: ["marketplace-admin-templates"] });
    },
    onError: (e: Error) =>
      toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  /** DB templates first, then the bundled catalog — one single grid. */
  const items = useMemo<GridItem[]>(() => {
    const custom: GridItem[] = rows.map((r) => ({
      key: `db-${r.id}`,
      id: r.id,
      builtin: false,
      name: r.name,
      description: r.description || "",
      category: r.category || "business",
      html: r.preview_html || "",
      variables: r.variables || [],
      source_url: r.source_url,
    }));
    const builtin: GridItem[] = COMMUNITY_TEMPLATES.map((t) => ({
      key: `builtin-${t.id}`,
      id: null,
      builtin: true,
      name: t.name,
      description: t.description || "",
      category: t.category || "business",
      html: t.content || "",
      variables: t.variables || [],
      source_url: null,
    }));
    return [...custom, ...builtin];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    );
  }, [items, search]);

  const shown = filtered.slice(0, visible);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Store className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Marketplace</h2>
        <Badge variant="outline" className="text-muted-foreground">
          {items.length} templates
        </Badge>
      </div>

      <Tabs defaultValue="custom" className="space-y-4">
        <TabsList>
          <TabsTrigger value="custom">Marketplace templates</TabsTrigger>
          <TabsTrigger value="submissions">User submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="custom" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setVisible(24); }}
                className="pl-8 w-full sm:w-64"
              />
            </div>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add template
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center text-muted-foreground space-y-3">
                <Package className="h-8 w-8 mx-auto opacity-50" />
                <p>No templates match your search.</p>
                <Button variant="outline" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" /> Add a template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[620px] pr-2">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((t) => (
                  <Card key={t.key} className="overflow-hidden flex flex-col">
                    <Thumb html={t.html} />
                    <CardContent className="p-3 flex flex-col gap-2 flex-1">
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-sm leading-tight line-clamp-2 flex-1">{t.name}</span>
                        <Badge variant={t.builtin ? "outline" : "secondary"} className="shrink-0 text-[10px]">
                          {t.builtin ? "Built-in" : "Custom"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {t.description || "(no description)"}
                      </p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">{t.category}</Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {t.variables.length} vars
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-auto pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => { setPreviewDevice("desktop"); setPreviewItem(t); }}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Preview
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(t)}>
                          <Pencil className="h-4 w-4 mr-1" /> {t.builtin ? "Copy & edit" : "Edit"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={t.builtin}
                          title={t.builtin ? "Built-in templates ship with the app" : "Delete"}
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => setToDelete(t)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {shown.length < filtered.length && (
                <div className="flex justify-center py-4">
                  <Button variant="outline" onClick={() => setVisible((v) => v + 24)}>
                    Load more ({filtered.length - shown.length} left)
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="submissions">
          <SharedTemplatesModerationPanel />
        </TabsContent>
      </Tabs>

      {/* Add / edit dialog — step 1: details, step 2: render preview */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) { setStep("edit"); setEditingId(null); }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {step === "edit"
                ? editingId ? "Edit marketplace template" : "Add marketplace template"
                : `Preview — ${form.name || "Untitled"}`}
            </DialogTitle>
            <DialogDescription>
              {step === "edit"
                ? <>Paste the full HTML (with inline CSS/JS). Variables like {"{{city}}"} are detected automatically.</>
                : "This is exactly how the template renders. Go back to edit, or save it to the Marketplace."}
            </DialogDescription>
          </DialogHeader>

          {step === "edit" ? (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Plumber landing page"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="business"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description shown on the card"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Source URL (optional)</Label>
              <Input
                value={form.source_url}
                onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                placeholder="https://example.com/design"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Template HTML</Label>
              <Textarea
                value={form.html}
                onChange={(e) => setForm((f) => ({ ...f, html: e.target.value }))}
                placeholder="<section>...</section>"
                className="font-mono text-xs h-56"
              />
              <p className="text-xs text-muted-foreground">
                Detected variables: {extractVariables(form.html).join(", ") || "none yet"}
              </p>
            </div>
          </div>
          ) : (
            <TemplatePreview
              html={form.html}
              device={previewDevice}
              onDeviceChange={setPreviewDevice}
              variables={extractVariables(form.html)}
            />
          )}

          <DialogFooter>
            {step === "edit" ? (
              <>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button
                  disabled={!form.name.trim() || !form.html.trim()}
                  onClick={() => setStep("preview")}
                >
                  <Eye className="h-4 w-4 mr-1" /> Preview
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setStep("edit")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to edit
                </Button>
                <Button
                  disabled={!form.name.trim() || !form.html.trim() || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editingId ? "Save changes" : "Save template"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full preview */}
      <Dialog open={!!previewItem} onOpenChange={(o) => !o && setPreviewItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Preview — {previewItem?.name}</DialogTitle>
            <DialogDescription>{previewItem?.description || "Marketplace template"}</DialogDescription>
          </DialogHeader>
          <TemplatePreview
            html={previewItem?.html || ""}
            device={previewDevice}
            onDeviceChange={setPreviewDevice}
            variables={previewItem?.variables || []}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewItem(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the template from the Marketplace for all users. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (toDelete?.id) deleteMutation.mutate(toDelete.id);
                setToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MarketplaceCatalogPanel;

