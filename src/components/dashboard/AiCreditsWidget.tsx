import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap } from "lucide-react";

export function AiCreditsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-credits"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-credits", {
        body: null,
        method: "GET",
      });
      // fallback: call with GET via query param
      const res = await supabase.functions.invoke("ai-credits?action=check", {});
      if (res.error) return null;
      return res.data?.credits;
    },
    refetchInterval: 60000,
  });

  const remaining = data?.remaining_credits ?? 0;
  const total = data?.total_credits ?? 100;
  const used = data?.used_credits ?? 0;
  const plan = data?.plan ?? "starter";
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;

  return (
    <Card className="shadow-surface">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          AI Credits
          <Badge variant="outline" className="ml-auto capitalize text-[10px]">{plan}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Skeleton className="h-4 w-full" />
        ) : (
          <>
            <Progress value={pct} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{remaining} / {total} credits remaining</span>
              <span className={pct <= 10 ? "text-destructive font-medium" : ""}>{used} used</span>
            </div>
            {pct <= 10 && (
              <p className="text-xs text-destructive">Credits running low. Please upgrade your plan.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
