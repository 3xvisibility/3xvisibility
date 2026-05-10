import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, AlertTriangle, Sparkles, Plus, X, Activity, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";

interface SystemSettings {
  id: string;
  ai_provider: string;
  feature_flags: Record<string, boolean>;
  maintenance_mode: boolean;
  maintenance_message: string | null;
}

const DEFAULT_FLAGS: { key: string; label: string; description: string }[] = [
  { key: "ai_template_scanner", label: "AI Template Scanner", description: "Allow scanning external sites for templates." },
  { key: "shopify_publishing", label: "Shopify Publishing", description: "Enable Shopify product/page publishing." },
  { key: "wordpress_publishing", label: "WordPress Publishing", description: "Enable WordPress publishing flow." },
  { key: "ai_image_generation", label: "AI Image Generation", description: "Allow AI to generate replacement images." },
  { key: "marketplace", label: "Template Marketplace", description: "Show shared/community templates." },
  { key: "affiliate_program", label: "Affiliate Program", description: "Show affiliate dashboard to users." },
];

export function SystemSettingsPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<SystemSettings | null>(null);
  const [newFlagKey, setNewFlagKey] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-panel", { body: { action: "get-settings" } });
      if (error) throw error;
      return data.settings as SystemSettings;
    },
  });

  useEffect(() => {
    if (data && !draft) setDraft({ ...data, feature_flags: { ...(data.feature_flags || {}) } });
  }, [data, draft]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Partial<SystemSettings>) => {
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "update-settings", ...payload },
      });
      if (error) throw error;
      return data.settings as SystemSettings;
    },
    onSuccess: (s) => {
      toast.success("Settings saved");
      qc.setQueryData(["admin-settings"], s);
      setDraft({ ...s, feature_flags: { ...(s.feature_flags || {}) } });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save settings"),
  });

  if (isLoading || !draft) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const updateFlag = (key: string, value: boolean) => {
    setDraft({ ...draft, feature_flags: { ...draft.feature_flags, [key]: value } });
  };

  const removeFlag = (key: string) => {
    const next = { ...draft.feature_flags };
    delete next[key];
    setDraft({ ...draft, feature_flags: next });
  };

  const addCustomFlag = () => {
    const k = newFlagKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!k) return;
    setDraft({ ...draft, feature_flags: { ...draft.feature_flags, [k]: true } });
    setNewFlagKey("");
  };

  const customFlags = Object.keys(draft.feature_flags).filter((k) => !DEFAULT_FLAGS.some((f) => f.key === k));
  const isDirty = JSON.stringify(draft) !== JSON.stringify(data);

  return (
    <div className="space-y-6">
      {/* AI Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Provider</CardTitle>
          <CardDescription>Default provider used for all AI generation across the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Provider</Label>
          <Select value={draft.ai_provider} onValueChange={(v) => setDraft({ ...draft, ai_provider: v })}>
            <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lovable">Lovable AI Gateway (default)</SelectItem>
              <SelectItem value="gemini">Google Gemini (direct)</SelectItem>
              <SelectItem value="openai">OpenAI (direct)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Requires the matching API key secret to be configured.</p>
        </CardContent>
      </Card>

      <AiProviderHealthCard provider={data?.ai_provider || draft.ai_provider} draftProvider={draft.ai_provider} />

      {/* Maintenance Mode */}
      <Card className={draft.maintenance_mode ? "border-destructive" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Maintenance Mode
            {draft.maintenance_mode && <Badge variant="destructive">ON</Badge>}
          </CardTitle>
          <CardDescription>When on, non-admin users see a maintenance banner and key actions are gated.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="maint-toggle">Enable maintenance mode</Label>
            <Switch
              id="maint-toggle"
              checked={draft.maintenance_mode}
              onCheckedChange={(v) => setDraft({ ...draft, maintenance_mode: v })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maint-msg">Message shown to users</Label>
            <Textarea
              id="maint-msg"
              rows={3}
              placeholder="We're performing scheduled maintenance. Back shortly."
              value={draft.maintenance_message || ""}
              onChange={(e) => setDraft({ ...draft, maintenance_message: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Toggle platform features on/off for all users.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DEFAULT_FLAGS.map((f) => (
            <div key={f.key} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
              <div className="space-y-1">
                <Label className="font-medium">{f.label}</Label>
                <p className="text-xs text-muted-foreground">{f.description}</p>
                <code className="text-[10px] text-muted-foreground">{f.key}</code>
              </div>
              <Switch
                checked={!!draft.feature_flags[f.key]}
                onCheckedChange={(v) => updateFlag(f.key, v)}
              />
            </div>
          ))}

          {customFlags.length > 0 && (
            <div className="pt-2 space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Custom flags</Label>
              {customFlags.map((k) => (
                <div key={k} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                  <code className="text-xs">{k}</code>
                  <div className="flex items-center gap-2">
                    <Switch checked={!!draft.feature_flags[k]} onCheckedChange={(v) => updateFlag(k, v)} />
                    <Button size="icon" variant="ghost" onClick={() => removeFlag(k)}><X className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Input
              placeholder="custom_flag_key"
              value={newFlagKey}
              onChange={(e) => setNewFlagKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomFlag()}
              className="max-w-xs"
            />
            <Button variant="outline" onClick={addCustomFlag}><Plus className="h-4 w-4 mr-1" /> Add flag</Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="sticky bottom-4 flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={!isDirty || saveMutation.isPending}
          onClick={() => data && setDraft({ ...data, feature_flags: { ...(data.feature_flags || {}) } })}
        >
          Reset
        </Button>
        <Button
          disabled={!isDirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate({
            ai_provider: draft.ai_provider,
            feature_flags: draft.feature_flags,
            maintenance_mode: draft.maintenance_mode,
            maintenance_message: draft.maintenance_message,
          })}
        >
          <Save className="h-4 w-4 mr-1" />
          {saveMutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

interface HealthResult {
  provider: string;
  provider_name: string;
  key_env: string;
  has_key: boolean;
  status: "healthy" | "missing_key" | "unauthorized" | "no_credits" | "rate_limited" | "timeout" | "unreachable" | "error" | "unknown";
  latency_ms: number | null;
  http_status?: number;
  message: string;
  checked_at: string;
}

function AiProviderHealthCard({ provider, draftProvider }: { provider: string; draftProvider: string }) {
  const qc = useQueryClient();
  const dirty = provider !== draftProvider;

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin-ai-health", provider],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "check-ai-provider", provider },
      });
      if (error) throw error;
      return data as HealthResult;
    },
    refetchOnWindowFocus: false,
  });

  const checkDraft = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "check-ai-provider", provider: draftProvider },
      });
      if (error) throw error;
      return data as HealthResult;
    },
    onSuccess: (r) => {
      qc.setQueryData(["admin-ai-health", draftProvider], r);
      if (r.status === "healthy") toast.success(`${r.provider_name} is healthy`);
      else toast.warning(`${r.provider_name}: ${r.message}`);
    },
    onError: (e: any) => toast.error(e.message || "Health check failed"),
  });

  const statusMeta = (s?: HealthResult["status"]) => {
    switch (s) {
      case "healthy": return { color: "bg-green-500/15 text-green-500 border-green-500/30", icon: CheckCircle2, label: "Healthy" };
      case "missing_key": return { color: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: AlertTriangle, label: "Missing key" };
      case "unauthorized": return { color: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle, label: "Unauthorized" };
      case "no_credits": return { color: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: AlertTriangle, label: "No credits" };
      case "rate_limited": return { color: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: AlertTriangle, label: "Rate limited" };
      case "timeout": return { color: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: AlertTriangle, label: "Timeout" };
      case "unreachable": return { color: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle, label: "Unreachable" };
      case "error": return { color: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle, label: "Error" };
      default: return { color: "bg-muted text-muted-foreground border-border", icon: Activity, label: "Unknown" };
    }
  };

  const meta = statusMeta(data?.status);
  const Icon = meta.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Provider Health</CardTitle>
        <CardDescription>Live verification of the saved AI provider's API key and reachability.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{data?.provider_name || provider}</span>
              <Badge variant="outline" className={meta.color}>
                <Icon className="h-3 w-3 mr-1" />
                {meta.label}
              </Badge>
              {data?.latency_ms != null && (
                <Badge variant="secondary" className="text-[10px]">{data.latency_ms} ms</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Secret: <code className="text-[11px]">{data?.key_env || "—"}</code>
              {data?.has_key === false && <span className="ml-2 text-amber-500">not configured</span>}
            </p>
            {data?.message && <p className="text-xs text-muted-foreground">{data.message}</p>}
            {data?.checked_at && (
              <p className="text-[10px] text-muted-foreground">Checked {new Date(data.checked_at).toLocaleTimeString()}</p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-1">Recheck</span>
          </Button>
        </div>

        {dirty && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-dashed">
            <p className="text-xs text-muted-foreground">
              Test the unsaved provider selection (<code className="text-[11px]">{draftProvider}</code>) before saving.
            </p>
            <Button size="sm" variant="secondary" onClick={() => checkDraft.mutate()} disabled={checkDraft.isPending}>
              {checkDraft.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Activity className="h-3.5 w-3.5 mr-1" />}
              Test draft
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
