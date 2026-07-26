import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, KeyRound, Sparkles, Trash2 } from "lucide-react";

interface ProviderRow {
  id: string;
  name: string;
  docs_url: string;
  key_env: string;
  default_model: string;
  enabled: boolean;
  has_key: boolean;
  key_source: "admin" | "secret" | null;
  key_preview: string | null;
  updated_at: string | null;
  active: boolean;
}

interface ProvidersState {
  active_provider: string;
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
      const j = await (error as any)?.context?.json?.();
      if (j?.error) msg = j.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as ProvidersState;
}

export default function AiProvidersAdminPanel() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { key: string; model: string }>>({});

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
      toast.success(
        action === "set-active"
          ? "Active AI provider updated"
          : action === "delete-key"
            ? "API key removed"
            : "API key saved",
      );
      setDrafts((d) => ({ ...d, [String(vars.provider)]: { key: "", model: d[String(vars.provider)]?.model || "" } }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
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

  return (
    <div className="space-y-4">
      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Providers
          </CardTitle>
          <CardDescription>
            Choose which AI platform powers every generation on the platform, and store its API key
            securely. Lovable AI works out of the box — for OpenAI, Gemini, Groq, DeepSeek or
            OpenRouter, paste that platform's own API key below and activate it.
          </CardDescription>
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

      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((p) => {
          const draft = drafts[p.id] || { key: "", model: "" };
          const isLovable = p.id === "lovable";
          return (
            <Card key={p.id} className={p.active ? "border-primary/50 shadow-surface" : "shadow-surface"}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {p.name}
                      {p.active && (
                        <Badge variant="secondary" className="gap-1 text-[11px]">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Default model: <span className="font-mono">{p.default_model}</span>
                    </CardDescription>
                  </div>
                  <Badge variant={p.has_key ? "outline" : "destructive"} className="text-[11px] shrink-0">
                    {p.has_key ? "Key set" : "No key"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.key_preview && (
                  <p className="text-xs text-muted-foreground font-mono">
                    {p.key_preview}
                    {p.key_source === "secret" && " · from project secret"}
                  </p>
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
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [p.id]: { ...draft, key: e.target.value } }))
                        }
                      />
                      <Input
                        placeholder={p.default_model}
                        value={draft.model}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [p.id]: { ...draft, model: e.target.value } }))
                        }
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
                      {p.key_source === "admin" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={mutate.isPending}
                          onClick={() => mutate.mutate({ action: "delete-key", provider: p.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove key
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
                  variant={p.active ? "secondary" : "outline"}
                  className="w-full"
                  disabled={p.active || mutate.isPending || (!isLovable && !p.has_key)}
                  onClick={() => mutate.mutate({ action: "set-active", provider: p.id })}
                >
                  {p.active ? "Currently active" : `Use ${p.name}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
