import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bot, CheckCircle2, AlertTriangle, ExternalLink, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProviderInfo {
  id: string;
  name: string;
  keyEnv: string;
  docsUrl: string;
  hasKey: boolean;
  active: boolean;
}

export default function AiProviderSettings() {
  const queryClient = useQueryClient();
  const [switching, setSwitching] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["ai-provider-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-provider-settings", {
        method: "GET",
      });
      if (error) throw error;
      return data as { provider: string; providers: ProviderInfo[] };
    },
    refetchInterval: false,
  });

  const switchMutation = useMutation({
    mutationFn: async (provider: string) => {
      setSwitching(provider);
      const { data, error } = await supabase.functions.invoke("ai-provider-settings", {
        body: { provider },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["ai-provider-settings"] });
      toast.success("AI Provider Updated", {
        description: result.message,
      });
      if (result.secret_instruction) {
        toast.info("Important", {
          description: result.secret_instruction,
          duration: 10000,
        });
      }
    },
    onError: (err: any) => {
      toast.error("Failed to switch provider", {
        description: err.message,
      });
    },
    onSettled: () => setSwitching(null),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const providers = data?.providers || [];
  const currentProvider = data?.provider || "lovable";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">AI Provider</CardTitle>
        </div>
        <CardDescription>
          Choose which AI service powers content generation, SEO optimization, and all AI features.
          Lovable AI is the default and requires no extra configuration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((p) => {
          const isActive = p.id === currentProvider;
          const isLovable = p.id === "lovable";
          const canSwitch = isLovable || p.hasKey;

          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                isActive
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isActive ? "bg-green-500" : "bg-muted-foreground/30"
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{p.name}</span>
                    {isActive && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        Active
                      </Badge>
                    )}
                    {isLovable && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Default
                      </Badge>
                    )}
                  </div>
                  {!isLovable && (
                    <div className="flex items-center gap-2 mt-1">
                      {p.hasKey ? (
                        <span className="text-xs text-green-500 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> API key configured
                        </span>
                      ) : (
                        <span className="text-xs text-amber-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {p.keyEnv} not set
                        </span>
                      )}
                      {p.docsUrl && (
                        <a
                          href={p.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5"
                        >
                          Get key <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant={isActive ? "outline" : "default"}
                disabled={isActive || !canSwitch || switching !== null}
                onClick={() => switchMutation.mutate(p.id)}
                className="shrink-0 ml-3"
              >
                {switching === p.id
                  ? "Switching..."
                  : isActive
                    ? "Current"
                    : canSwitch
                      ? "Activate"
                      : "Add Key First"}
              </Button>
            </div>
          );
        })}

        <div className="pt-3 border-t border-border">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              External provider API keys must be added as project secrets. If an external provider
              fails, the system automatically falls back to Lovable AI to prevent service interruption.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
