import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ArrowRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useSubscription } from "@/hooks/use-subscription";

export function PagesUsageWidget() {
  const navigate = useNavigate();
  const { basePath } = useWorkspace();
  const {
    plan,
    pagesUsed,
    pagesLimit,
    pagesRemaining,
    resetDate,
    isLoading,
  } = useSubscription();

  const unlimited = pagesLimit === -1;
  const percentUsed = unlimited || pagesLimit <= 0 ? 0 : Math.round((pagesUsed / pagesLimit) * 100);
  const isExhausted = !unlimited && pagesUsed >= pagesLimit;
  const isWarning = !unlimited && percentUsed >= 80;

  const resetLabel = (() => {
    if (!resetDate) return null;
    const d = new Date(resetDate);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  })();

  return (
    <Card className="shadow-surface border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Remaining pages this period
          <Badge variant="outline" className="ml-auto capitalize text-[10px]">
            {plan}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : unlimited ? (
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold tabular-nums">∞</span>
            <p className="text-xs text-muted-foreground">
              Unlimited pages on this plan.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-bold tabular-nums tracking-tight block">
                  {pagesRemaining.toLocaleString()}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  remaining this period
                </p>
              </div>
              {isExhausted && (
                <Badge variant="destructive" className="text-[10px]">
                  Limit reached
                </Badge>
              )}
              {!isExhausted && isWarning && (
                <Badge variant="outline" className="text-[10px] border-warning text-warning">
                  {percentUsed}% used
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              <Progress value={Math.min(100, percentUsed)} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{pagesUsed.toLocaleString()} used</span>
                <span>{pagesLimit.toLocaleString()} limit</span>
              </div>
            </div>

            {(isExhausted || isWarning) && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                <p className="text-xs text-destructive flex-1">
                  {isExhausted
                    ? "You've reached your page limit for this period."
                    : `You're at ${percentUsed}% of your page limit.`}
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

            {resetLabel && (
              <p className="text-[11px] text-muted-foreground">
                Resets on <span className="font-medium text-foreground">{resetLabel}</span>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
