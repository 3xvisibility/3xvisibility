import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Bot, Search, Sparkles, Check, Settings2, Power } from "lucide-react";

const PROVIDERS = [
  { id: "lovable", name: "Lovable AI (Default)" },
  { id: "openai", name: "OpenAI" },
  { id: "gemini", name: "Google Gemini" },
  { id: "groq", name: "Groq" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "openrouter", name: "OpenRouter" },
];

const PURPOSES = [
  { id: "short_content", label: "Short content" },
  { id: "medium_content", label: "Medium content" },
  { id: "full_page", label: "Full page" },
  { id: "seo_optimization", label: "SEO optimization" },
  { id: "rewrite", label: "Rewrite" },
  { id: "translation", label: "Translation" },
  { id: "social_caption", label: "Social captions" },
  { id: "product_description", label: "Product descriptions" },
  { id: "template_scan", label: "Template scan" },
];

interface AccessRow {
  user_id: string;
  provider: string;
  enabled: boolean;
  purposes: string[];
  notes: string | null;
}

interface AdminUserLite {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
}

function providerName(id: string) {
  return PROVIDERS.find((p) => p.id === id)?.name || id;
}

export function AiAccessAdminPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<AdminUserLite | null>(null);
  const [draft, setDraft] = useState<{ provider: string; enabled: boolean; purposes: string[]; notes: string }>({
    provider: "lovable",
    enabled: true,
    purposes: [],
    notes: "",
  });

  const { data: stats, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin-panel"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-panel", { body: { action: "get-stats" } });
      if (error) throw error;
      return data as { users: AdminUserLite[] };
    },
  });

  const { data: accessData, isLoading: loadingAccess } = useQuery({
    queryKey: ["admin-ai-access"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-panel", { body: { action: "get-ai-access" } });
      if (error) throw error;
      return data as { access: AccessRow[] };
    },
  });

  const accessMap = useMemo(() => {
    const m = new Map<string, AccessRow>();
    (accessData?.access || []).forEach((a) => m.set(a.user_id, a));
    return m;
  }, [accessData]);

  const saveMutation = useMutation({
    mutationFn: async (vars: { target_user_id: string; provider: string; enabled: boolean; purposes: string[]; notes: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "set-ai-access", ...vars },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success("AI access updated");
      queryClient.invalidateQueries({ queryKey: ["admin-ai-access"] });
      setEditUser(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to update"),
  });

  const openEditor = (u: AdminUserLite) => {
    const existing = accessMap.get(u.id);
    setDraft({
      provider: existing?.provider || "lovable",
      enabled: existing?.enabled ?? true,
      purposes: existing?.purposes || [],
      notes: existing?.notes || "",
    });
    setEditUser(u);
  };

  const togglePurpose = (id: string) => {
    setDraft((d) => ({
      ...d,
      purposes: d.purposes.includes(id) ? d.purposes.filter((p) => p !== id) : [...d.purposes, id],
    }));
  };

  const users = (stats?.users || []).filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = loadingUsers || loadingAccess;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">AI Access Control</CardTitle>
        </div>
        <CardDescription>
          Decide which AI provider each user may use and for which features. Users can no longer change
          providers or API keys themselves — you control it all here. Leave purposes empty to allow every feature.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No users found</p>
        ) : (
          <div className="rounded-xl border divide-y divide-border">
            {users.map((u) => {
              const access = accessMap.get(u.id);
              const enabled = access?.enabled ?? true;
              const provider = access?.provider || "lovable";
              const purposes = access?.purposes || [];
              return (
                <div key={u.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
                    {enabled ? (
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary gap-1">
                        <Sparkles className="h-3 w-3" /> {providerName(provider)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 gap-1">
                        <Power className="h-3 w-3" /> Disabled
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {purposes.length === 0 ? "All features" : `${purposes.length} feature${purposes.length > 1 ? "s" : ""}`}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => openEditor(u)}>
                    <Settings2 className="h-3.5 w-3.5" /> Manage
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI Access</DialogTitle>
            <DialogDescription>
              {editUser?.full_name || editUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="text-sm">AI enabled</Label>
                <p className="text-[11px] text-muted-foreground">Turn off to block all AI features for this user.</p>
              </div>
              <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} />
            </div>

            <div className="space-y-2">
              <Label>AI Provider</Label>
              <Select value={draft.provider} onValueChange={(v) => setDraft((d) => ({ ...d, provider: v }))} disabled={!draft.enabled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Allowed features</Label>
              <p className="text-[11px] text-muted-foreground">Select none to allow every AI feature.</p>
              <div className="grid grid-cols-2 gap-2">
                {PURPOSES.map((p) => {
                  const active = draft.purposes.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={!draft.enabled}
                      onClick={() => togglePurpose(p.id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-left transition-colors disabled:opacity-50 ${
                        active ? "border-primary/50 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground/40"
                      }`}
                    >
                      <span className={`h-4 w-4 rounded flex items-center justify-center shrink-0 ${active ? "bg-primary text-primary-foreground" : "border border-border"}`}>
                        {active && <Check className="h-3 w-3" />}
                      </span>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Admin note (optional)</Label>
              <Input value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Internal note…" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={saveMutation.isPending}>Cancel</Button>
            <Button
              onClick={() => editUser && saveMutation.mutate({ target_user_id: editUser.id, ...draft })}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
