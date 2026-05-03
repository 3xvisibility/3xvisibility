import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, FileText, Search, Globe, PenLine, Languages, Image, Bot, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const PROMPT_TYPE_META: Record<string, { label: string; icon: React.ElementType }> = {
  short_content: { label: "Short Content", icon: FileText },
  medium_content: { label: "Medium Content", icon: FileText },
  full_page: { label: "Full Page", icon: FileText },
  seo_optimization: { label: "SEO Optimization", icon: Search },
  rewrite: { label: "Rewrite", icon: PenLine },
  translation: { label: "Translation", icon: Languages },
  social_caption: { label: "Social Caption", icon: Sparkles },
  product_description: { label: "Product Description", icon: FileText },
  template_scan: { label: "Template Scan", icon: Image },
  default: { label: "Other", icon: Bot },
};

interface UsageEntry {
  prompt_type: string;
  credits_used: number;
  created_at: string;
}

interface AiCreditsWidgetProps {
  /** Percentage threshold (0–100) below which the upgrade prompt appears. Default: 10 */
  lowThreshold?: number;
}

export function AiCreditsWidget({ lowThreshold = 10 }: AiCreditsWidgetProps) {
  const navigate = useNavigate();
  const { basePath } = useWorkspace();
  const { data: credits, isLoading: creditsLoading, isError: creditsError } = useQuery({
    queryKey: ["ai-credits"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("ai-credits?action=check", {});
      if (res.error) throw new Error("Failed to fetch credits");
      return res.data?.credits;
    },
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
    retry: 1,
    meta: { errorToast: "credits" },
  });

  const { data: usageData, isLoading: usageLoading, isError: usageError } = useQuery({
    queryKey: ["ai-credits-usage"],
    queryFn: async () => {
      const res = await supabase.functions.invoke("ai-credits?action=usage", {});
      if (res.error) throw new Error("Failed to fetch usage");
      return (res.data?.usage ?? []) as UsageEntry[];
    },
    refetchInterval: 60000,
    placeholderData: (prev) => prev,
    retry: 1,
    meta: { errorToast: "usage" },
  });

  const hasError = creditsError || usageError;

  const remaining = credits?.remaining_credits ?? 0;
  const total = credits?.total_credits ?? 100;
  const used = credits?.used_credits ?? 0;
  const plan = credits?.plan ?? "starter";
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;

  // Aggregate usage by prompt_type
  const breakdown = (usageData ?? []).reduce<Record<string, number>>((acc, entry) => {
    const key = entry.prompt_type || "default";
    acc[key] = (acc[key] || 0) + (entry.credits_used || 0);
    return acc;
  }, {});

  const sortedBreakdown = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const isLoading = creditsLoading || usageLoading;

  return (
    <Card className="shadow-surface">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          AI Credits
          <Badge variant="outline" className="ml-auto capitalize text-[10px]">{plan}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <Progress value={pct} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{remaining.toLocaleString()} / {total.toLocaleString()} remaining</span>
              <span className={pct <= lowThreshold ? "text-destructive font-medium" : ""}>{used.toLocaleString()} used</span>
            </div>
            {pct <= lowThreshold && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                <p className="text-xs text-destructive flex-1">
                  Credits running low. Upgrade to continue generating.
                </p>
                <Button
                  size="sm"
                  variant="default"
                  className="shrink-0 gap-1 h-7 text-xs"
                  onClick={() => navigate(`${basePath}/billing`)}
                >
                  Upgrade <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}

            {sortedBreakdown.length > 0 && (
              <div className="pt-1 space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Usage Breakdown</p>
                {sortedBreakdown.map(([type, count]) => {
                  const meta = PROMPT_TYPE_META[type] || PROMPT_TYPE_META.default;
                  const Icon = meta.icon;
                  const typePct = used > 0 ? Math.round((count / used) * 100) : 0;
                  return (
                    <div key={type} className="flex items-center gap-2 text-xs">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{meta.label}</span>
                      <span className="text-muted-foreground tabular-nums">{count}</span>
                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${typePct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
