import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Lock } from "lucide-react";

const PROVIDER_NAMES: Record<string, string> = {
  lovable: "Lovable AI Gateway (Default)",
  openai: "OpenAI",
  gemini: "Google Gemini",
  groq: "Groq",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
};

/**
 * Read-only card showing the active global AI provider.
 * Visible to platform admins only — hidden entirely for non-admins.
 */
export default function ActiveAiProviderCard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setIsAdmin(false);
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (active) setIsAdmin(!!data);
    })();
    return () => {
      active = false;
    };
  }, []);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["active-ai-provider"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-panel", {
        body: { action: "get-settings" },
      });
      if (error) throw error;
      return data.settings as { ai_provider: string };
    },
  });

  // Hidden entirely for non-admins (and while admin status is unknown)
  if (isAdmin !== true) return null;

  const provider = settings?.ai_provider || "lovable";

  return (
    <Card className="shadow-surface">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Active AI Provider</CardTitle>
        </div>
        <CardDescription>
          The AI provider currently powering content generation for all users. This is controlled
          centrally in Admin → System Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="outline" className="border-primary/30 text-primary gap-1">
                <Sparkles className="h-3 w-3" />
                {PROVIDER_NAMES[provider] || provider}
              </Badge>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
              <Lock className="h-3 w-3" /> Read-only
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
