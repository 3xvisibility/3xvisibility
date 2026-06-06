import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/hooks/use-subscription";
import { useLanguage } from "@/i18n/LanguageContext";

interface PeriodRow {
  key: string;
  month: number;
  year: number;
  count: number;
}

function buildPeriods(dates: string[]): PeriodRow[] {
  const map = new Map<string, number>();
  for (const iso of dates) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12)
    .map(([key, count]) => {
      const [y, m] = key.split("-").map(Number);
      return { key, year: y, month: m, count };
    });
}

export function UsageHistoryWidget() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const { resetDate } = useSubscription();
  const { t } = useLanguage();

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ["dashboard-usage-history", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_pages")
        .select("created_at")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return buildPeriods((data ?? []).map((r: any) => r.created_at).filter(Boolean));
    },
  });

  const maxCount = Math.max(1, ...periods.map((p) => p.count));

  const resetLabel = (() => {
    if (!resetDate) return null;
    const d = new Date(resetDate);
    if (isNaN(d.getTime())) return null;
    return `${t(`dashboard.month${d.getMonth() + 1}`)} ${d.getDate()}, ${d.getFullYear()}`;
  })();

  return (
    <Card className="shadow-surface border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          {t("dashboard.usageHistory")}
          {resetLabel && (
            <Badge variant="outline" className="ml-auto gap-1 text-[10px] font-normal">
              <CalendarClock className="h-3 w-3" />
              {t("dashboard.usageResets", { date: resetLabel })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : periods.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("dashboard.usageNoPages")}
          </p>
        ) : (
          <ul className="space-y-3">
            {periods.map((p) => (
              <li key={p.key} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-muted-foreground truncate">
                  {t(`dashboard.month${p.month}`)} {p.year}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((p.count / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-sm font-medium tabular-nums">
                  {p.count.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
