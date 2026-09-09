import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Globe, Trash2, RefreshCw, Mail, ExternalLink } from "lucide-react";

interface AnalyzerLead {
  id: string;
  url: string;
  host: string | null;
  page_title: string | null;
  overall_score: number | null;
  seo_score: number | null;
  ai_score: number | null;
  technical_score: number | null;
  issue_count: number | null;
  top_issues: unknown;
  email: string | null;
  user_email: string | null;
  referrer: string | null;
  user_agent: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-primary/15 text-primary border-primary/30" },
  contacted: { label: "Contacted", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  converted: { label: "Converted", className: "bg-success/15 text-success border-success/30" },
  ignored: { label: "Ignored", className: "bg-muted text-muted-foreground border-border" },
};

function scoreClass(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-amber-500";
  return "text-destructive";
}

export function AnalyzerLeadsPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<AnalyzerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [selected, setSelected] = useState<AnalyzerLead | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("analyzer_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Failed to load leads", description: error.message, variant: "destructive" });
    } else {
      setItems((data as unknown as AnalyzerLead[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      const matchesStatus = statusFilter === "__all__" || it.status === statusFilter;
      const matchesSearch =
        !q ||
        it.url.toLowerCase().includes(q) ||
        (it.host || "").toLowerCase().includes(q) ||
        (it.email || "").toLowerCase().includes(q) ||
        (it.user_email || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);

  const updateLead = async (id: string, patch: Partial<AnalyzerLead>) => {
    const { error } = await supabase.from("analyzer_leads").update(patch as never).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("analyzer_leads").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast({ title: "Lead deleted" });
  };

  const openLead = (lead: AnalyzerLead) => {
    setSelected(lead);
    setNotes(lead.notes || "");
    if (lead.status === "new") void updateLead(lead.id, { status: "contacted" } as Partial<AnalyzerLead>);
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    const ok = await updateLead(selected.id, { notes } as Partial<AnalyzerLead>);
    setSaving(false);
    if (ok) {
      toast({ title: "Notes saved" });
      setSelected(null);
    }
  };

  const withEmail = items.filter((i) => i.email || i.user_email).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total scans</p>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">With contact email</p>
          <p className="text-2xl font-bold">{withEmail}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">New / not followed up</p>
          <p className="text-2xl font-bold">{items.filter((i) => i.status === "new").length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by website or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="ignored">Ignored</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading leads…
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-muted-foreground">
          <Globe className="h-8 w-8" />
          <p>No website scans yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => {
            const meta = STATUS_META[lead.status] ?? STATUS_META.new;
            return (
              <div
                key={lead.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <button className="min-w-0 flex-1 text-left" onClick={() => openLead(lead)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{lead.host || lead.url}</span>
                    <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
                    {(lead.email || lead.user_email) && (
                      <Badge variant="outline" className="gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email || lead.user_email}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {new Date(lead.created_at).toLocaleString()} · {lead.issue_count ?? 0} issues ·{" "}
                    {lead.referrer ? `from ${lead.referrer}` : "direct visit"}
                  </p>
                </button>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${scoreClass(lead.overall_score)}`}>
                      {lead.overall_score ?? "—"}
                    </p>
                    <p className="text-[10px] uppercase text-muted-foreground">score</p>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={lead.url} target="_blank" rel="noreferrer noopener">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(lead.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="truncate">{selected?.host || selected?.url}</DialogTitle>
            <DialogDescription>
              Scanned {selected ? new Date(selected.created_at).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  ["Overall", selected.overall_score],
                  ["SEO", selected.seo_score],
                  ["AI/GEO", selected.ai_score],
                  ["Technical", selected.technical_score],
                ].map(([label, val]) => (
                  <div key={String(label)} className="rounded-md border border-border p-2">
                    <p className={`text-lg font-bold ${scoreClass(val as number | null)}`}>{(val as number) ?? "—"}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <p><span className="text-muted-foreground">Website: </span>{selected.url}</p>
              <p><span className="text-muted-foreground">Page title: </span>{selected.page_title || "—"}</p>
              <p><span className="text-muted-foreground">Contact email: </span>{selected.email || "not provided"}</p>
              <p><span className="text-muted-foreground">Signed-in account: </span>{selected.user_email || "anonymous"}</p>
              <p><span className="text-muted-foreground">Came from: </span>{selected.referrer || "direct"}</p>
              <p className="break-words"><span className="text-muted-foreground">Browser: </span>{selected.user_agent || "—"}</p>
              {Array.isArray(selected.top_issues) && selected.top_issues.length > 0 && (
                <div>
                  <p className="text-muted-foreground">Top issues</p>
                  <ul className="ml-4 list-disc">
                    {(selected.top_issues as string[]).map((iss, i) => (
                      <li key={i}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-2">
                <Select
                  value={selected.status}
                  onValueChange={(v) => {
                    void updateLead(selected.id, { status: v } as Partial<AnalyzerLead>);
                    setSelected({ ...selected, status: v });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="ignored">Ignored</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Internal notes about this lead…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {selected?.email && (
              <Button variant="outline" asChild>
                <a href={`mailto:${selected.email}?subject=Your website report for ${selected.host}`}>
                  <Mail className="mr-2 h-4 w-4" /> Email lead
                </a>
              </Button>
            )}
            <Button onClick={saveNotes} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
