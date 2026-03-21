import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { getMinimumPlanFor, FEATURE_LABELS, PLAN_FEATURES, type FeatureKey } from "@/lib/plan-features";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface UpgradePromptProps {
  feature: FeatureKey;
  variant?: "inline" | "overlay" | "banner";
  className?: string;
}

export function UpgradePrompt({ feature, variant = "inline", className = "" }: UpgradePromptProps) {
  const navigate = useNavigate();
  const { basePath } = useWorkspace();
  const minPlan = getMinimumPlanFor(feature);
  const planLabel = PLAN_FEATURES[minPlan].label;
  const featureLabel = FEATURE_LABELS[feature];

  if (variant === "banner") {
    return (
      <div className={`flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 ${className}`}>
        <Lock className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-foreground flex-1">
          <span className="font-medium">{featureLabel}</span> is available on the{" "}
          <span className="font-semibold text-primary">{planLabel}</span> plan and above.
        </p>
        <Button size="sm" onClick={() => navigate(`${basePath}/billing`)} className="shrink-0 gap-1.5">
          Upgrade <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (variant === "overlay") {
    return (
      <div className={`absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl ${className}`}>
        <div className="text-center space-y-3 max-w-sm px-6">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">{featureLabel}</h3>
          <p className="text-sm text-muted-foreground">
            Upgrade to the <span className="font-semibold text-primary">{planLabel}</span> plan to unlock this feature.
          </p>
          <Button onClick={() => navigate(`${basePath}/billing`)} className="gap-1.5">
            <Sparkles className="h-4 w-4" /> Upgrade to {planLabel}
          </Button>
        </div>
      </div>
    );
  }

  // inline
  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="font-semibold">{featureLabel}</h4>
          <p className="text-sm text-muted-foreground">
            This feature requires the <span className="font-semibold text-primary">{planLabel}</span> plan or higher.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate(`${basePath}/billing`)} className="shrink-0 gap-1.5 mt-1">
          Upgrade <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  allowed: boolean;
}

export function FeatureGate({ feature, children, fallback, allowed }: FeatureGateProps) {
  if (allowed) return <>{children}</>;
  return fallback ?? <UpgradePrompt feature={feature} />;
}

interface UsageLimitBannerProps {
  type: "pages" | "ai" | "sites";
  used: number;
  limit: number;
  className?: string;
}

export function UsageLimitBanner({ type, used, limit, className = "" }: UsageLimitBannerProps) {
  const navigate = useNavigate();
  const { basePath } = useWorkspace();

  // Unlimited = no banner
  if (limit === -1) return null;

  const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;

  if (percent < 80) return null;

  const isExhausted = used >= limit;
  const labels: Record<string, string> = { pages: "page generations", ai: "AI generations", sites: "connected websites" };
  const label = labels[type] ?? type;

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
      isExhausted 
        ? "border-destructive/30 bg-destructive/5" 
        : "border-warning/30 bg-warning/5"
    } ${className}`}>
      <Sparkles className={`h-4 w-4 shrink-0 ${isExhausted ? "text-destructive" : "text-warning"}`} />
      <p className="text-sm flex-1">
        {isExhausted ? (
          <>You've reached the limit of <span className="font-semibold">{limit}</span> {label} on your plan.</>
        ) : (
          <>You've used <span className="font-semibold">{used}</span> of <span className="font-semibold">{limit}</span> {label} ({percent}%).</>
        )}
      </p>
      <Button size="sm" variant={isExhausted ? "default" : "outline"} onClick={() => navigate(`${basePath}/billing`)} className="shrink-0 gap-1.5">
        Upgrade <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
