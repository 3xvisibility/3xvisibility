import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings2, Save, RotateCcw, Eye, EyeOff, Database, Server } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface ConfigEntry {
  key: string;
  value: string;
  has_override: boolean;
  is_secret: boolean;
  source: "database" | "env";
  env_value: string;
  updated_at: string | null;
}

const PROVIDER_OPTIONS = [
  { value: "lovable", label: "Lovable AI (Default)" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Google Gemini" },
  { value: "groq", label: "Groq" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "openrouter", label: "OpenRouter" },
];

const KEY_LABELS: Record<string, string> = {
  AI_PROVIDER: "AI Provider",
  OPENAI_API_KEY: "OpenAI API Key",
  GEMINI_API_KEY: "Google Gemini API Key",
  GROQ_API_KEY: "Groq API Key",
  DEEPSEEK_API_KEY: "DeepSeek API Key",
  OPENROUTER_API_KEY: "OpenRouter API Key",
  APP_URL: "Application URL",
  ENVIRONMENT: "Environment (development / production)",
  SHOPIFY_REDIRECT_URI: "Shopify OAuth Redirect URI",
};

export default function EnvironmentConfigSettings() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const { data: configs, isLoading } = useQuery({
    queryKey: ["env-config", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await supabase.functions.invoke(
        `manage-config?workspace_id=${wsId}`,
        { method: "GET" },
      );
      if (error) throw error;
      return (data?.configs ?? []) as ConfigEntry[];
    },
    enabled: !!wsId,
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-config", {
        body: { workspace_id: wsId, key, value },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["env-config", wsId] });
      queryClient.invalidateQueries({ queryKey: ["ai-provider-settings"] });
      toast.success(result.message);
    },
    onError: (err: any) => {
      toast.error("Failed to update config", { description: err.message });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (key: string) => {
      const { data, error } = await supabase.functions.invoke("manage-config", {
        method: "DELETE",
        body: { workspace_id: wsId, key },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (result, key) => {
      queryClient.invalidateQueries({ queryKey: ["env-config", wsId] });
      queryClient.invalidateQueries({ queryKey: ["ai-provider-settings"] });
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success(result.message);
    },
    onError: (err: any) => {
      toast.error("Failed to reset config", { description: err.message });
    },
  });

  const handleSave = (key: string) => {
    const val = editValues[key];
    if (val === undefined || val === "") {
      toast.error("Value cannot be empty");
      return;
    }
    upsertMutation.mutate({ key, value: val });
  };

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!wsId) {
    return null;
  }

  return (
    <Card className="shadow-surface">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Environment Configuration</CardTitle>
        </div>
        <CardDescription>
          Override environment variables dynamically without redeploying. Changes take effect immediately for all AI requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <>
            {(configs ?? []).map((cfg) => {
              const isProvider = cfg.key === "AI_PROVIDER";
              const editVal = editValues[cfg.key];
              const isRevealed = revealedKeys.has(cfg.key);
              const isBusy =
                (upsertMutation.isPending && upsertMutation.variables?.key === cfg.key) ||
                (resetMutation.isPending && resetMutation.variables === cfg.key);

              return (
                <div
                  key={cfg.key}
                  className={`rounded-lg border p-4 space-y-2 transition-colors ${
                    cfg.has_override ? "border-primary/30 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Label className="text-sm font-medium">
                        {KEY_LABELS[cfg.key] ?? cfg.key}
                      </Label>
                      {cfg.has_override ? (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-1">
                          <Database className="h-2.5 w-2.5" /> Override
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                          <Server className="h-2.5 w-2.5" /> Env Default
                        </Badge>
                      )}
                    </div>
                    <code className="text-[10px] text-muted-foreground font-mono">{cfg.key}</code>
                  </div>

                  {/* Current effective value */}
                  {cfg.env_value && !cfg.has_override && (
                    <p className="text-xs text-muted-foreground">
                      Current: <span className="font-mono">{cfg.env_value}</span>
                    </p>
                  )}

                  {/* Input */}
                  <div className="flex items-center gap-2">
                    {isProvider ? (
                      <Select
                        value={editVal ?? ((cfg.has_override ? cfg.value : "") || "lovable")}
                        onValueChange={(v) =>
                          setEditValues((prev) => ({ ...prev, [cfg.key]: v }))
                        }
                      >
                        <SelectTrigger className="flex-1 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVIDER_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="relative flex-1">
                        <Input
                          type={cfg.is_secret && !isRevealed ? "password" : "text"}
                          placeholder={
                            cfg.has_override
                              ? "(override set)"
                              : cfg.env_value
                                ? "(using env default)"
                                : "Enter value..."
                          }
                          value={editVal ?? ""}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              [cfg.key]: e.target.value,
                            }))
                          }
                          className="h-9 pr-9 font-mono text-xs"
                        />
                        {cfg.is_secret && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(cfg.key)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {isRevealed ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="default"
                      className="h-9 gap-1 shrink-0"
                      disabled={isBusy || (editVal === undefined && !isProvider)}
                      onClick={() => handleSave(cfg.key)}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </Button>

                    {cfg.has_override && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 gap-1 shrink-0"
                        disabled={isBusy}
                        onClick={() => resetMutation.mutate(cfg.key)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </Button>
                    )}
                  </div>

                  {cfg.has_override && cfg.updated_at && (
                    <p className="text-[10px] text-muted-foreground">
                      Override set {new Date(cfg.updated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Override</strong> values take priority over environment defaults. Use <strong>Reset</strong> to revert to the environment variable.
                API keys are stored securely and never displayed in plain text after saving.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
