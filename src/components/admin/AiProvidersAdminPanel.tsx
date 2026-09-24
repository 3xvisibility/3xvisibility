import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, ExternalLink, FileText, Globe, KeyRound, Loader2, Palette, Plus, RefreshCw, Sparkles, Split, Trash2 } from "lucide-react";

interface ProviderRow {
  id: string;
  name: string;
  provider_name: string;
  base_url: string;
  docs_url: string;
  key_env: string;
  default_model: string;
  models: string[];
  enabled: boolean;
  has_key: boolean;
  key_source: "admin" | "secret" | null;
  key_preview: string | null;
  updated_at: string | null;
  active: boolean;
  is_custom: boolean;
}

interface ProvidersState {
  active_provider: string;
  routing?: { design: string; content: string; split_enabled: boolean };
  providers: ProviderRow[];
}

async function callFn(body?: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-ai-providers", {
    body,
    method: body ? "POST" : "GET",
  });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as unknown as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (ctx?.json) {
        const j = await ctx.json();
        if (j?.error) msg = j.error;
      }
    } catch {
      // Ignore JSON parsing failures; use the original message.
    }
    throw new Error(msg);
  }
  if ((data as unknown as { error?: string })?.error) throw new Error((data as unknown as { error?: string }).error!);
  return data as ProvidersState & { models?: string[] };
}

export default function AiProvidersAdminPanel() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { key: string; model: string }>>({});
  const [routing, setRouting] = useState<{ design?: string; content?: string }>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newProvider, setNewProvider] = useState({ id: "", name: "", base_url: "", api_key: "", default_model: "" });
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-ai-providers"],
    queryFn: () => callFn(),
  });

  const mutate = useMutation({
    mutationFn: (body: Record<string, unknown>) => callFn(body),
    onSuccess: (res, vars) => {
      qc.setQueryData(["admin-ai-providers"], res);
      qc.invalidateQueries({ queryKey: ["active-ai-provider"] });
      const action = String(vars.action);
      if (action === "fetch-models") {
        setFetchedModels((res as unknown as { models?: string[] }).models || []);
        setFetchingModels(false);
        return;
      }
      toast.success(
        action === "set-active"
          ? "Active AI provider updated"
          : action === "set-routing"
            ? "Task routing updated"
            : action === "delete-provider" || action === "delete-key"
              ? "Provider removed"
              : action === "add-provider"
                ? "Provider added"
                : "API key saved",
      );
      setDrafts((d) => ({ ...d, [String(vars.provider)]: { key: "", model: d[String(vars.provider)]?.model || "" } }));
      if (action === "add-provider" || action === "delete-provider") {
        setAddDialogOpen(false);
        setNewProvider({ id: "", name: "", base_url: "", api_key: "", default_model: "" });
        setFetchedModels([]);
        if (action === "delete-provider") setExpanded(null);
      }
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setFetchingModels(false);
    },
  });

  const handleFetchModels = () => {
    if (!newProvider.base_url || !newProvider.api_key) {
      toast.error("Enter Base URL and API Key first");
      return;
    }
    setFetchingModels(true);
    mutate.mutate({ action: "fetch-models", base_url: newProvider.base_url, api_key: newProvider.api_key });
  };

  const handleAddProvider = () => {
    if (!newProvider.id.trim()) { toast.error("Provider ID is required"); return; }
    if (!newProvider.base_url.trim()) { toast.error("Base URL is required"); return; }
    if (!newProvider.api_key.trim()) { toast.error("API Key is required"); return; }
    mutate.mutate({
      action: "add-provider",
      provider: newProvider.id.trim().toLowerCase(),
      provider_name: newProvider.name.trim() || newProvider.id.trim(),
      base_url: newProvider.base_url.trim(),
      api_key: newProvider.api_key.trim(),
      default_model: newProvider.default_model.trim(),
      models: fetchedModels,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const providers = data?.providers || [];
  const designProvider = routing.design ?? data?.routing?.design ?? "inherit";
  const contentProvider = routing.content ?? data?.routing?.content ?? "inherit";
  const routable = providers.filter((p) => p.has_key || p.id === "lovable");

  return (
    <div className="space-y-4">
      <Card className="shadow-surface">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Providers
              </CardTitle>
              <CardDescription>
                All configured providers in one list. Add any OpenAI-compatible provider by its Base URL, API Key and name, then activate exactly one.
              </CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 shrink-0">
                  <Plus className="h-4 w-4" /> Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add AI Provider</DialogTitle>
                  <DialogDescription>
                    Any OpenAI-compatible API works (OpenAI, Anthropic via proxy, Together, Fireworks, local vLLM, etc.)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="prov-id">Provider ID</Label>
                      <Input
                        id="prov-id"
                        placeholder="e.g. together"
                        value={newProvider.id}
                        onChange={(e) => setNewProvider((p) => ({ ...p, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="prov-name">Display Name</Label>
                      <Input
                        id="prov-name"
                        placeholder="e.g. Together AI"
                        value={newProvider.name}
                        onChange={(e) => setNewProvider((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prov-url">Base URL</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="prov-url"
                        placeholder="https://api.together.xyz/v1"
                        className="pl-9"
                        value={newProvider.base_url}
                        onChange={(e) => setNewProvider((p) => ({ ...p, base_url: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prov-key">API Key</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="prov-key"
                        type="password"
                        autoComplete="off"
                        placeholder="sk-..."
                        className="pl-9"
                        value={newProvider.api_key}
                        onChange={(e) => setNewProvider((p) => ({ ...p, api_key: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={fetchingModels || !newProvider.base_url || !newProvider.api_key}
                      onClick={handleFetchModels}
                    >
                      {fetchingModels ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                      Fetch Models
                    </Button>
                    {fetchedModels.length > 0 && (
                      <span className="text-xs text-muted-foreground">{fetchedModels.length} models found</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prov-model">Default Model</Label>
                    {fetchedModels.length > 0 ? (
                      <Select value={newProvider.default_model} onValueChange={(v) => setNewProvider((p) => ({ ...p, default_model: v }))}>
                        <SelectTrigger id="prov-model">
                          <SelectValue placeholder="Select a model..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {fetchedModels.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="prov-model"
                        placeholder="e.g. meta-llama/Llama-3-70b-chat-hf"
                        value={newProvider.default_model}
                        onChange={(e) => setNewProvider((p) => ({ ...p, default_model: e.target.value }))}
                      />
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddProvider} disabled={mutate.isPending}>
                    {mutate.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                    Add Provider
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Currently active:</span>
            <Badge className="bg-primary/15 text-primary border-primary/30">
              {providers.find((p) => p.active)?.name || data?.active_provider}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-surface">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Split className="h-4 w-4 text-primary" />
            Split Routing
          </CardTitle>
          <CardDescription>
            Route design tasks (site builder, templates, layout) to one provider and content/SEO tasks to another.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" /> Design Tasks
              </label>
              <Select value={designProvider} onValueChange={(v) => setRouting((r) => ({ ...r, design: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Follow active provider</SelectItem>
                  {routable.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Content & SEO Tasks
              </label>
              <Select value={contentProvider} onValueChange={(v) => setRouting((r) => ({ ...r, content: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">Follow active provider</SelectItem>
                  {routable.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            size="sm"
            disabled={mutate.isPending}
            onClick={() => mutate.mutate({ action: "set-routing", design: designProvider, content: contentProvider })}
          >
            Save Routing
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-surface overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Providers ({providers.length})</CardTitle>
          <CardDescription>Click a row to edit its key or model. Activate exactly one provider.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {providers.map((p) => {
              const draft = drafts[p.id] || { key: "", model: "" };
              const isLovable = p.id === "lovable";
              const isOpen = expanded === p.id;
              return (
                <div key={p.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate text-sm font-semibold">{p.name}</span>
                        {p.active && (
                          <Badge variant="secondary" className="gap-1 text-[11px] shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </Badge>
                        )}
                        {p.is_custom && (
                          <Badge variant="outline" className="text-[10px] shrink-0">Custom</Badge>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
                        {p.base_url && <span className="font-mono truncate">{p.base_url}</span>}
                        {p.default_model && <span className="font-mono truncate shrink-0">· {p.default_model}</span>}
                      </div>
                    </div>
                    <Badge variant={p.has_key ? "outline" : "destructive"} className="text-[11px] shrink-0">
                      {p.has_key ? "Key set" : "No key"}
                    </Badge>
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t border-border bg-muted/20 px-4 py-4 pl-11">
                      {p.key_preview && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {p.key_preview}
                          {p.key_source === "secret" && " · from project secret"}
                        </p>
                      )}

                      {p.models && p.models.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.models.slice(0, 8).map((m) => (
                            <Badge key={m} variant="secondary" className="text-[10px] font-mono px-1.5 py-0">{m}</Badge>
                          ))}
                          {p.models.length > 8 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{p.models.length - 8} more</Badge>
                          )}
                        </div>
                      )}

                      {isLovable ? (
                        <p className="text-xs text-muted-foreground">
                          Built-in Lovable AI gateway — no API key required.
                        </p>
                      ) : (
                        <>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input
                              type="password"
                              autoComplete="off"
                              placeholder={p.has_key ? "Replace API key…" : "Paste API key…"}
                              value={draft.key}
                              onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: { ...draft, key: e.target.value } }))}
                            />
                            <Input
                              placeholder={p.default_model || "Default model"}
                              value={draft.model}
                              onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: { ...draft, model: e.target.value } }))}
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              disabled={mutate.isPending || (!draft.key && !draft.model)}
                              onClick={() =>
                                mutate.mutate({
                                  action: "save-key",
                                  provider: p.id,
                                  api_key: draft.key || undefined,
                                  default_model: draft.model || p.default_model,
                                })
                              }
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Save
                            </Button>
                            {(p.key_source === "admin" || p.is_custom) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                disabled={mutate.isPending}
                                onClick={() => mutate.mutate({ action: p.is_custom ? "delete-provider" : "delete-key", provider: p.id })}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {p.is_custom ? "Remove" : "Remove key"}
                              </Button>
                            )}
                            {p.docs_url && (
                              <a
                                href={p.docs_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                              >
                                Get API key <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </>
                      )}

                      <Separator />

                      <Button
                        size="sm"
                        variant={p.active ? "secondary" : "default"}
                        disabled={p.active || mutate.isPending || (!isLovable && !p.has_key)}
                        onClick={() => mutate.mutate({ action: "set-active", provider: p.id })}
                      >
                        {p.active ? "Currently active" : `Use ${p.name}`}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}