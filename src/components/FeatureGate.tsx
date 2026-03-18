import { useSubscription } from "@/hooks/use-subscription";
import { getMinimumPlanFor, PLAN_FEATURES, type FeatureKey } from "@/lib/plan-features";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
}

export function FeatureGate({ feature, children }: FeatureGateProps) {
  const { canUseFeature } = useSubscription();
  const navigate = useNavigate();

  if (canUseFeature(feature)) {
    return <>{children}</>;
  }

  const minPlan = getMinimumPlanFor(feature);
  const planLabel = PLAN_FEATURES[minPlan].label;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="rounded-full bg-muted p-6 mb-6">
        <Lock className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Feature Locked
      </h2>
      <p className="text-muted-foreground max-w-md mb-6">
        This feature requires the <span className="font-semibold text-foreground">{planLabel}</span> plan or higher. Upgrade your subscription to unlock access.
      </p>
      <Button onClick={() => navigate("/billing")} size="lg" className="gap-2">
        Upgrade to {planLabel}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
